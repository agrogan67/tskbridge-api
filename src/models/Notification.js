/**
 * Notification model.
 *
 * Fields: recipient user ID, event type, project ID, message, read status, created timestamp.
 *
 * ASSUMPTION: tenantId and projectName are retained because AuditNotificationService supplies them.
 */
class Notification {
  constructor({
    id,
    tenantId,
    recipientUserId,
    eventType,
    projectId,
    projectName = null,
    message,
    isRead = false,
    createdAt = new Date(),
  }) {
    this.id = id;
    this.tenantId = tenantId;
    this.recipientUserId = recipientUserId;
    this.eventType = eventType;
    this.projectId = projectId;
    this.projectName = projectName;
    this.message = message;
    this.isRead = isRead;
    this.createdAt = createdAt;
  }

  /** Validate a notification. Returns { valid, errors }. */
  static validate(data) {
    const errors = [];
    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['notification is required'] };
    }
    for (const field of ['recipientUserId', 'eventType', 'projectId', 'message']) {
      if (typeof data[field] !== 'string' || data[field].trim() === '') {
        errors.push(`${field} is required`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  /** Build a Notification from a database row (snake_case). */
  static fromRow(row) {
    return new Notification({
      id: row.id,
      tenantId: row.tenant_id,
      recipientUserId: row.recipient_user_id,
      eventType: row.event_type,
      projectId: row.project_id,
      projectName: row.project_name,
      message: row.message,
      isRead: row.is_read,
      createdAt: row.created_at,
    });
  }
}

module.exports = Notification;
