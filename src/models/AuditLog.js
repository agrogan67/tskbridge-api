/**
 * AuditLog model. Immutable once written: no update or delete operations are permitted.
 *
 * Fields: event type, entity type, entity ID, actor (user ID + organisation/tenant),
 * previous state snapshot, new state snapshot, and timestamp.
 *
 * ASSUMPTION: "organisation" is represented by `tenantId`, matching AuditNotificationService.
 * ASSUMPTION: ipAddress/userAgent are optional extras already accepted by the service.
 */
const REQUIRED_STRING_FIELDS = ['tenantId', 'userId', 'eventType', 'entityType', 'entityId'];

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function snapshot(value) {
  if (value === undefined || value === null) return null;
  return deepFreeze(JSON.parse(JSON.stringify(value)));
}

class AuditLog {
  constructor({
    id,
    tenantId,
    userId,
    eventType,
    entityType,
    entityId,
    previousState = null,
    newState = null,
    ipAddress = null,
    userAgent = null,
    createdAt = new Date(),
  }) {
    this.id = id;
    this.tenantId = tenantId;
    this.userId = userId;
    this.eventType = eventType;
    this.entityType = entityType;
    this.entityId = entityId;
    this.previousState = snapshot(previousState);
    this.newState = snapshot(newState);
    this.ipAddress = ipAddress;
    this.userAgent = userAgent;
    this.createdAt = createdAt;
    Object.freeze(this); // immutable
  }

  /** Validate an audit event. Returns { valid, errors }. */
  static validate(event) {
    const errors = [];
    if (!event || typeof event !== 'object') {
      return { valid: false, errors: ['event is required'] };
    }
    for (const field of REQUIRED_STRING_FIELDS) {
      if (typeof event[field] !== 'string' || event[field].trim() === '') {
        errors.push(`${field} is required`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  /** Build an AuditLog from a database row (snake_case). */
  static fromRow(row) {
    return new AuditLog({
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      eventType: row.event_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      previousState: row.previous_state,
      newState: row.new_state,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    });
  }
}

module.exports = AuditLog;
