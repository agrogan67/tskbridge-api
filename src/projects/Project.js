/**
 * Project model (homework assignment). Maps to the `projects` table in SPEC.md 2.1.
 */
const PROJECT_STATUSES = Object.freeze(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'ON_HOLD']);

class Project {
  constructor({ id, name, description = null, teamId, status = 'ACTIVE', createdAt, updatedAt, deletedAt = null }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.teamId = teamId;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.deletedAt = deletedAt;
  }

  /** Build a Project from a database row (snake_case). */
  static fromRow(row) {
    return new Project({
      id: row.id,
      name: row.name,
      description: row.description,
      teamId: row.team_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    });
  }
}

module.exports = { Project, PROJECT_STATUSES };
