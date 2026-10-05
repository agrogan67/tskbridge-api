/**
 * API endpoints for audit and notifications.
 */

const express = require('express');
const AuditNotificationService = require('../services/AuditNotificationService');

function parsePositiveInt(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

function buildRouter({ auditLogRepository, notificationRepository, teamRepository }) {
  const router = express.Router();
  const service = new AuditNotificationService(
    auditLogRepository,
    notificationRepository,
    teamRepository
  );

  router.post('/audit', async (req, res) => {
    try {
      const body = req.body || {};
      const tenantId = body.tenantId || req.headers['x-tenant-id'];

      const result = await service.recordAuditAndNotify({
        tenantId,
        userId: body.userId,
        eventType: body.eventType,
        entityType: body.entityType,
        entityId: body.entityId,
        previousState: body.previousState,
        newState: body.newState,
        projectName: body.projectName,
        teamId: body.teamId,
        ipAddress: body.ipAddress,
        userAgent: body.userAgent
      });

      return res.status(201).json({
        success: true,
        data: result.auditLog,
        notificationsCreated: result.notificationsCreated
      });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/audit/:projectId', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
      const { projectId } = req.params;
      const { from, to, eventType } = req.query;

      const result = await service.getAuditHistory(projectId, tenantId, {
        from,
        to,
        eventType,
        limit: parsePositiveInt(req.query.limit, 50)
      });

      return res.status(200).json({
        success: true,
        data: result.auditLogs,
        total: result.total,
        filters: {
          from: from || null,
          to: to || null,
          eventType: eventType || null
        }
      });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  });

  router.get('/notifications/:userId', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
      const { userId } = req.params;
      const limit = parsePositiveInt(req.query.limit, 50);

      const notifications = await service.getUnreadNotifications(userId, tenantId, limit);

      return res.status(200).json({
        success: true,
        data: notifications,
        total: notifications.length
      });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  });

  router.patch('/notifications/:id/read', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.body?.tenantId || req.query.tenantId;
      const notificationId = req.params.id;

      const notification = await service.markNotificationAsRead(notificationId, tenantId);

      return res.status(200).json({
        success: true,
        data: notification
      });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = buildRouter;
