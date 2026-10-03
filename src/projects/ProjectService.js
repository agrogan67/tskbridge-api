const { randomUUID } = require('crypto');
const { Project, PROJECT_STATUSES } = require('./Project');
const { ValidationError, ProjectNotFoundError, DatabaseError } = require('../errors/AppErrors');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * ProjectService - create, update status, get by team, delete (soft).
 * Uses the IDatabase abstraction with parameterized queries only.
 *
 * ASSUMPTION: Team existence check (SPEC 7 / 409) is not done here because
 *   no team lookup contract exists yet.
 * ASSUMPTION: Audit/notification hooks are out of scope for now.
 * ASSUMPTION: `projects` has no tenant_id in SPEC 2.1, so tenant scoping is not applied.
 */
class ProjectService {
  /** @param {import('../database/IDatabase').IDatabase} db */
  constructor(db) {
    if (!db) throw new ValidationError('Database is required', ['db']);
    this.db = db;
  }

  async create({ name, description = null, teamId }) {
    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (cleanName.length < 1 || cleanName.length > 255) {
      throw new ValidationError('name must be 1-255 characters', ['name']);
    }
    if (description != null && (typeof description !== 'string' || description.length > 5000)) {
      throw new ValidationError('description must be at most 5000 characters', ['description']);
    }
    if (typeof teamId !== 'string' || !UUID_RE.test(teamId)) {
      throw new ValidationError('teamId must be a valid UUID', ['teamId']);
    }

    const id = randomUUID();
    try {
      await this.db.execute(
        `INSERT INTO projects (id, name, description, team_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'ACTIVE', NOW(), NOW())`,
        [id, cleanName, description, teamId]
      );
      return await this._getById(id);
    } catch (err) {
      throw this._wrap(err);
    }
  }

  async updateStatus(id, status) {
    if (!PROJECT_STATUSES.includes(status)) {
      throw new ValidationError(`status must be one of: ${PROJECT_STATUSES.join(', ')}`, ['status']);
    }
    try {
      await this._getById(id); // throws ProjectNotFoundError if missing/deleted
      await this.db.execute(
        'UPDATE projects SET status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL',
        [status, id]
      );
      return await this._getById(id);
    } catch (err) {
      throw this._wrap(err);
    }
  }

  /** Returns non-deleted projects for a team (SPEC 3.1: active assignments). */
  async getByTeam(teamId) {
    if (typeof teamId !== 'string' || !UUID_RE.test(teamId)) {
      throw new ValidationError('teamId must be a valid UUID', ['teamId']);
    }
    try {
      const rows = await this.db.query(
        `SELECT id, name, description, team_id, status, created_at, updated_at, deleted_at
           FROM projects
          WHERE team_id = ? AND deleted_at IS NULL
          ORDER BY created_at DESC`,
        [teamId]
      );
      return rows.map(Project.fromRow);
    } catch (err) {
      throw this._wrap(err);
    }
  }

  /** Soft delete (SPEC 5): sets deleted_at, never removes the row. */
  async delete(id) {
    try {
      await this._getById(id);
      await this.db.execute(
        'UPDATE projects SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
    } catch (err) {
      throw this._wrap(err);
    }
  }

  async _getById(id) {
    const rows = await this.db.query(
      `SELECT id, name, description, team_id, status, created_at, updated_at, deleted_at
         FROM projects WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    if (rows.length === 0) throw new ProjectNotFoundError();
    return Project.fromRow(rows[0]);
  }

  _wrap(err) {
    if (err && err.statusCode) return err; // already an AppError
    return new DatabaseError('Database operation failed', err);
  }
}

module.exports = { ProjectService };
