/**
 * Project model: data structure and validation only (no business logic).
 *
 * Fields:
 *  - id:          UUID v4, auto-generated, required
 *  - name:        string, 1-255 chars, required, trimmed
 *  - description: string, max 5000 chars, optional, trimmed
 *  - teamId:      UUID v4, required (must reference an existing team; checked by upper layers)
 *  - status:      ACTIVE | INACTIVE | ARCHIVED | ON_HOLD (default ACTIVE)
 *  - createdAt:   Date, auto-set on creation, immutable
 *  - updatedAt:   Date, auto-set on creation/update
 *  - deletedAt:   Date or null (soft delete marker), immutable once set
 *
 * @example
 * const { Project } = require('./Project');
 * const { valid, errors } = Project.validate({ name: 'Math', teamId: '...' });
 */
const { randomUUID } = require('crypto');

const PROJECT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED',
  ON_HOLD: 'ON_HOLD',
});

const NAME_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 5000;
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

class Project {
  /**
   * Creates a Project, applying defaults and trimming text fields.
   * Does not validate; call Project.validate first.
   * @param {Object} data
   * @param {string} [data.id] Generated if omitted
   * @param {string} data.name
   * @param {string} [data.description]
   * @param {string} data.teamId
   * @param {string} [data.status='ACTIVE']
   * @param {Date} [data.createdAt]
   * @param {Date} [data.updatedAt]
   * @param {Date|null} [data.deletedAt]
   */
  constructor(data = {}) {
    const now = new Date();
    this.id = data.id || randomUUID();
    this.name = typeof data.name === 'string' ? data.name.trim() : data.name;
    this.description =
      typeof data.description === 'string' ? data.description.trim() : data.description;
    this.teamId = data.teamId;
    this.status = data.status || PROJECT_STATUS.ACTIVE;
    this.createdAt = data.createdAt || now;
    this.updatedAt = data.updatedAt || now;
    this.deletedAt = data.deletedAt || null;
  }

  /**
   * Validates project data.
   * Rules: id (if present) UUID v4; name required, 1-255 chars after trim;
   * description optional, max 5000 chars after trim; teamId required UUID v4;
   * status (if present) one of PROJECT_STATUS; timestamps (if present) valid Dates,
   * deletedAt may be null.
   * @param {Object} data Raw project data
   * @returns {{valid: boolean, errors: Array<{field: string, message: string}>}}
   */
  static validate(data) {
    const errors = [];
    const add = (field, message) => errors.push({ field, message });
    const d = data || {};

    if (d.id !== undefined && !(typeof d.id === 'string' && UUID_V4_REGEX.test(d.id))) {
      add('id', 'id must be a valid UUID v4');
    }

    if (typeof d.name !== 'string' || d.name.trim().length === 0) {
      add('name', 'name is required');
    } else if (d.name.trim().length > NAME_MAX_LENGTH) {
      add('name', `name must be at most ${NAME_MAX_LENGTH} characters`);
    }

    if (d.description !== undefined && d.description !== null) {
      if (typeof d.description !== 'string') {
        add('description', 'description must be a string');
      } else if (d.description.trim().length > DESCRIPTION_MAX_LENGTH) {
        add('description', `description must be at most ${DESCRIPTION_MAX_LENGTH} characters`);
      }
    }

    if (typeof d.teamId !== 'string' || !UUID_V4_REGEX.test(d.teamId)) {
      add('teamId', 'teamId is required and must be a valid UUID v4');
    }

    if (d.status !== undefined && !Object.values(PROJECT_STATUS).includes(d.status)) {
      add('status', `status must be one of ${Object.values(PROJECT_STATUS).join(', ')}`);
    }

    for (const field of ['createdAt', 'updatedAt']) {
      if (d[field] !== undefined && !isValidDate(d[field])) add(field, `${field} must be a valid Date`);
    }
    if (d.deletedAt !== undefined && d.deletedAt !== null && !isValidDate(d.deletedAt)) {
      add('deletedAt', 'deletedAt must be a valid Date or null');
    }

    return { valid: errors.length === 0, errors };
  }
}

module.exports = { Project, PROJECT_STATUS, NAME_MAX_LENGTH, DESCRIPTION_MAX_LENGTH };
