/**
 * Audit & Notification Service
 * Core business logic for audit logging and notifications
 * Handles project events and notifies relevant team members
 */

const { v4: uuidv4 } = require('uuid');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');
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

  /**
   * Record an audit event and notify team members
   * Called by ProjectService after mutations
   * @async
   * @param {Object} auditEvent - Event to audit
   * @param {string} auditEvent.tenantId - Tenant ID
   * @param {string} auditEvent.userId - User ID performing action
   * @param {string} auditEvent.eventType - Event type
   * @param {string} auditEvent.entityType - Entity type (Project)
   * @param {string} auditEvent.entityId - Project ID
   * @param {Object} auditEvent.previousState - Previous state
   * @param {Object} auditEvent.newState - New state
   * @param {string} auditEvent.projectName - Project name (for notifications)
   * @param {string} auditEvent.teamId - Team ID (for notifications)
   * @param {string} [auditEvent.ipAddress] - User IP
   * @param {string} [auditEvent.userAgent] - User agent
   * @returns {Promise<Object>} { auditLog, notificationsCreated }
   * @throws {ValidationError} If audit data is invalid
   */
  async recordAuditAndNotify(auditEvent) {
    logger.info('AuditNotificationService.recordAuditAndNotify', {
      tenantId: auditEvent.tenantId,
      eventType: auditEvent.eventType,
      entityId: auditEvent.entityId
    });

    // Validate audit event
    const validation = AuditLog.validate(auditEvent);
    if (!validation.valid) {
      logger.warn('Audit event validation failed', {
        tenantId: auditEvent.tenantId,
        errors: validation.errors
      });
      throw new ValidationError('Invalid audit event', validation.errors);
    }

    try {
      // Step 1: Create immutable audit log entry
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

      logger.debug('Audit log recorded', {
        auditLogId: auditLog.id,
        eventType: auditEvent.eventType
      });

      // Step 2: Generate and create notifications for team members
      let notificationsCreated = 0;
      try {
        notificationsCreated = await this._notifyTeamMembers(
          auditEvent.tenantId,
          auditEvent.teamId,
          auditEvent.eventType,
          auditEvent.entityId,
          auditEvent.projectName,
          auditEvent.userId // Don't notify the user who made the change
        );
      } catch (notificationError) {
        // Non-blocking: notification failure should not fail audit
        logger.error('Failed to create notifications', {
          error: notificationError.message,
          auditLogId: auditLog.id
        });
      }

      logger.info('Audit and notifications completed', {
        auditLogId: auditLog.id,
        notificationsCreated
      });

      return {
        auditLog,
        notificationsCreated
      };
    } catch (error) {
      logger.error('Failed to record audit', {
        error: error.message,
        tenantId: auditEvent.tenantId
      });
      throw error;
    }
  }

  /**
   * Get audit history for a project
   * @async
   * @param {string} projectId - Project ID
   * @param {string} tenantId - Tenant ID (for authorization)
   * @param {Object} [filters] - Optional filters
   * @param {string} [filters.eventType] - Filter by event type
   * @param {Date} [filters.from] - Start date (ISO string or Date)
   * @param {Date} [filters.to] - End date (ISO string or Date)
   * @param {number} [filters.limit=50] - Max results
   * @returns {Promise<Object>} { auditLogs: [], total: number }
   * @throws {ValidationError} If filters are invalid
   */
  async getAuditHistory(projectId, tenantId, filters = {}) {
    logger.debug('AuditNotificationService.getAuditHistory', {
      projectId,
      tenantId,
      eventType: filters.eventType
    });

    // Validate filters
    if (filters.limit && (!Number.isInteger(filters.limit) || filters.limit < 1)) {
      throw new ValidationError('Invalid filters', ['limit must be a positive integer']);
    }

    const validatedFilters = {
      eventType: filters.eventType,
      fromDate: filters.from ? new Date(filters.from) : null,
      toDate: filters.to ? new Date(filters.to) : null,
      limit: Math.min(filters.limit || 50, 500)
    };

    try {
      const result = await this.auditLogRepository.findByEntity(
        tenantId,
        projectId,
        validatedFilters
      );

      logger.debug('Audit history retrieved', {
        projectId,
        count: result.logs.length,
        total: result.total
      });

      return {
        auditLogs: result.logs,
        total: result.total,
        projectId,
        filters: validatedFilters
      };
    } catch (error) {
      logger.error('Failed to get audit history', {
        error: error.message,
        projectId,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Get unread notifications for a user
   * @async
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @param {number} [limit=50] - Max results
   * @returns {Promise<Array>} Array of unread notifications
   */
  async getUnreadNotifications(userId, tenantId, limit = 50) {
    logger.debug('AuditNotificationService.getUnreadNotifications', {
      userId,
      tenantId
    });

    try {
      const notifications = await this.notificationRepository.findUnread(
        tenantId,
        userId,
        limit
      );

      logger.debug('Unread notifications retrieved', {
        userId,
        count: notifications.length
      });

      return notifications;
    } catch (error) {
      logger.error('Failed to get unread notifications', {
        error: error.message,
        userId,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @async
   * @param {string} notificationId - Notification ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Updated notification
   */
  async markNotificationAsRead(notificationId, tenantId) {
    logger.debug('AuditNotificationService.markNotificationAsRead', {
      notificationId,
      tenantId
    });

    try {
      const notification = await this.notificationRepository.markAsRead(
        notificationId,
        tenantId
      );

      logger.info('Notification marked as read', {
        notificationId,
        tenantId
      });

      return notification;
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        error: error.message,
        notificationId,
        tenantId
      });
      throw error;
    }
  }

  /**
   * Notify all team members about project event
   * @private
   * @param {string} tenantId - Tenant ID
   * @param {string} teamId - Team ID
   * @param {string} eventType - Event type
   * @param {string} projectId - Project ID
   * @param {string} projectName - Project name
   * @param {string} excludeUserId - User ID to exclude (who made the change)
   * @returns {Promise<number>} Number of notifications created
   */
  async _notifyTeamMembers(tenantId, teamId, eventType, projectId, projectName, excludeUserId) {
    logger.debug('AuditNotificationService._notifyTeamMembers', {
      tenantId,
      teamId,
      eventType
    });

    try {
      // Get template for this event
      const template = this.notificationTemplates[eventType];
      if (!template) {
        logger.warn('No notification template for event', { eventType });
        return 0;
      }

      // Get team members
      const teamMembers = await this.teamRepository.getTeamMembers(teamId, tenantId);
      if (!teamMembers || teamMembers.length === 0) {
        logger.debug('No team members to notify', { teamId });
        return 0;
      }

      // Filter out the user who made the change
      const recipientUserIds = teamMembers
        .map(m => m.userId)
        .filter(userId => userId !== excludeUserId);

      if (recipientUserIds.length === 0) {
        logger.debug('No recipients after filtering', { teamId });
        return 0;
      }

      // Generate message
      const message = template.messageTemplate(projectName);

      // Create notifications for all recipients
      const notifications = recipientUserIds.map(userId => ({
        tenantId,
        recipientUserId: userId,
        eventType: template.eventType,
        projectId,
        projectName,
        message
      }));

      const created = await this.notificationRepository.createBulk(notifications);

      logger.info('Team members notified', {
        teamId,
        count: created.length,
        eventType
      });

      return created.length;
    } catch (error) {
      logger.error('Failed to notify team members', {
        error: error.message,
        teamId,
        eventType
      });
      throw error;
    }
  }
}

module.exports = AuditNotificationService;
