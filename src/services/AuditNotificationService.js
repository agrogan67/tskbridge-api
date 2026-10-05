/**
 * Audit & Notification Service
 * Core business logic for audit logging and notifications
 * Handles project events and notifies relevant team members
 */

const AuditLog = require('../models/AuditLog');
const { ValidationError } = require('../errors/AppErrors');

class AuditNotificationService {
  /**
   * Create AuditNotificationService instance
   * @param {AuditLogRepository} auditLogRepository - Audit log data access
   * @param {NotificationRepository} notificationRepository - Notification data access
   * @param {TeamRepository} teamRepository - For fetching team members
   */
  constructor(auditLogRepository, notificationRepository, teamRepository) {
    this.auditLogRepository = auditLogRepository;
    this.notificationRepository = notificationRepository;
    this.teamRepository = teamRepository;

    // Map event types to notification templates
    this.notificationTemplates = {
      PROJECT_CREATED: {
        eventType: 'PROJECT_CREATED',
        messageTemplate: (projectName) => `New project created: "${projectName}"`
      },
      PROJECT_UPDATED: {
        eventType: 'PROJECT_UPDATED',
        messageTemplate: (projectName) => `Project updated: "${projectName}"`
      },
      PROJECT_STATUS_CHANGED: {
        eventType: 'PROJECT_STATUS_CHANGED',
        messageTemplate: (projectName, status) => `Project status changed to ${status}: "${projectName}"`
      },
      PROJECT_DELETED: {
        eventType: 'PROJECT_DELETED',
        messageTemplate: (projectName) => `Project archived: "${projectName}"`
      }
    };
  }

  async recordAuditAndNotify(auditEvent) {
    const validation = AuditLog.validate(auditEvent);
    if (!validation.valid) {
      throw new ValidationError('Invalid audit event', validation.errors);
    }

    const auditLog = await this.auditLogRepository.create({
      tenantId: auditEvent.tenantId,
      userId: auditEvent.userId,
      eventType: auditEvent.eventType,
      entityType: auditEvent.entityType,
      entityId: auditEvent.entityId,
      previousState: auditEvent.previousState,
      newState: auditEvent.newState,
      ipAddress: auditEvent.ipAddress,
      userAgent: auditEvent.userAgent
    });

    let notificationsCreated = 0;
    try {
      notificationsCreated = await this._notifyTeamMembers(
        auditEvent.tenantId,
        auditEvent.teamId,
        auditEvent.eventType,
        auditEvent.entityId,
        auditEvent.projectName,
        auditEvent.userId
      );
    } catch (_) {
      // non-blocking by design
    }

    return {
      auditLog,
      notificationsCreated
    };
  }

  async getAuditHistory(projectId, tenantId, filters = {}) {
    if (!tenantId) {
      throw new ValidationError('Invalid filters', ['tenantId is required']);
    }

    if (filters.limit && (!Number.isInteger(filters.limit) || filters.limit < 1)) {
      throw new ValidationError('Invalid filters', ['limit must be a positive integer']);
    }

    const validatedFilters = {
      eventType: filters.eventType || null,
      fromDate: filters.from ? new Date(filters.from) : null,
      toDate: filters.to ? new Date(filters.to) : null,
      limit: Math.min(filters.limit || 50, 500)
    };

    const result = await this.auditLogRepository.findByEntity(
      tenantId,
      projectId,
      validatedFilters
    );

    return {
      auditLogs: result.logs,
      total: result.total,
      projectId,
      filters: validatedFilters
    };
  }

  async getUnreadNotifications(userId, tenantId, limit = 50) {
    if (!tenantId) {
      throw new ValidationError('Invalid request', ['tenantId is required']);
    }

    return this.notificationRepository.findUnread(
      tenantId,
      userId,
      limit
    );
  }

  async markNotificationAsRead(notificationId, tenantId) {
    if (!tenantId) {
      throw new ValidationError('Invalid request', ['tenantId is required']);
    }

    return this.notificationRepository.markAsRead(
      notificationId,
      tenantId
    );
  }

  async _notifyTeamMembers(tenantId, teamId, eventType, projectId, projectName, excludeUserId) {
    const template = this.notificationTemplates[eventType];
    if (!template) {
      return 0;
    }

    const teamMembers = await this.teamRepository.getTeamMembers(teamId, tenantId);
    if (!teamMembers || teamMembers.length === 0) {
      return 0;
    }

    const recipientUserIds = teamMembers
      .map((m) => m.userId)
      .filter((userId) => userId !== excludeUserId);

    if (recipientUserIds.length === 0) {
      return 0;
    }

    const message = template.messageTemplate(projectName);

    const notifications = recipientUserIds.map((userId) => ({
      tenantId,
      recipientUserId: userId,
      eventType: template.eventType,
      projectId,
      projectName,
      message
    }));

    const created = await this.notificationRepository.createBulk(notifications);
    return created.length;
  }
}

module.exports = AuditNotificationService;
