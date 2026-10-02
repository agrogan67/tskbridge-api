const { DatabaseError, ProjectNotFoundError, ValidationError } = require('../errors/AppErrors');
const logger = require('../utils/logger');

/**
 * @typedef {'ACTIVE'|'INACTIVE'|'ARCHIVED'|'ON_HOLD'} ProjectStatus
 */

/**
 * Input used to create a project.
 *
 * @typedef {Object} CreateProjectInput
 * @property {string} name - Project name, trimmed and limited to 255 characters.
 * @property {string} [description] - Optional description, limited to 5000 characters.
 * @property {string} teamId - Team UUID.
 */

/**
 * Input used to update a project's status.
 *
 * @typedef {Object} UpdateProjectStatusInput
 * @property {string} id - Project UUID.
 * @property {ProjectStatus} status - New project status.
 */

/**
 * Project data returned to callers.
 *
 * @typedef {Object} ProjectResponse
 * @property {string} id - Project UUID.
 * @property {string} name - Project name.
 * @property {string|null} description - Project description.
 * @property {string} teamId - Team UUID.
 * @property {string} tenantId - Owning organisation UUID.
 * @property {ProjectStatus} status - Project status.
 * @property {Date} createdAt - Creation timestamp.
 * @property {Date} updatedAt - Last update timestamp.
 * @property {Date|null} deletedAt - Soft-delete timestamp.
 */

/**
 * Paginated project list returned by getByTeam.
 *
 * @typedef {Object} PaginatedProjectListResponse
 * @property {ProjectResponse[]} projects - Projects on the requested page.
 * @property {number} total - Total number of matching projects.
 * @property {number} page - Current page.
 * @property {number} limit - Maximum projects on the page.
 * @property {number} totalPages - Number of pages.
 */

const PROJECT_STATUSES = new Set(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'ON_HOLD']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUuid(value, field) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new ValidationError(`Invalid ${field}`, [field]);
  }
}

function toProjectResponse(project) {
  return project && typeof project.get === 'function' ? project.get({ plain: true }) : project;
}

function toDatabaseError(error) {
  return error instanceof DatabaseError
    ? error
    : new DatabaseError('Database operation failed', error);
}

/**
 * Project business operations with tenant isolation and input validation.
 */
class ProjectService {
  /**
   * Create a project service.
   *
   * @param {import('../repositories/ProjectRepository')} projectRepository - Project data access.
   */
  constructor(projectRepository) {
    this.projectRepository = projectRepository;
  }

  /**
   * Create a project for an organisation.
   *
   * @param {CreateProjectInput} input - Project fields.
   * @param {string} tenantId - Owning organisation UUID.
   * @returns {Promise<ProjectResponse>} The created project.
   * @throws {ValidationError} If the input is invalid.
   * @throws {DatabaseError} If persistence fails.
   */
  async create(input = {}, tenantId) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new ValidationError('Invalid project input', ['input']);
    }
    const { name, description, teamId } = input;
    logger.debug('ProjectService.create', { tenantId, teamId });
    validateUuid(tenantId, 'tenantId');
    validateUuid(teamId, 'teamId');

    if (typeof name !== 'string') {
      throw new ValidationError('Invalid project name', ['name']);
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 255) {
      throw new ValidationError('Project name must be between 1 and 255 characters', ['name']);
    }
    if (description !== undefined && description !== null
      && (typeof description !== 'string' || description.length > 5000)) {
      throw new ValidationError('Project description must be at most 5000 characters', ['description']);
    }

    try {
      const project = await this.projectRepository.create({
        name: trimmedName,
        description: description ?? null,
        teamId
      }, tenantId);
      logger.info('Project created', { projectId: project.id, tenantId, teamId });
      return toProjectResponse(project);
    } catch (error) {
      logger.error('Failed to create project', { tenantId, teamId, error: error.message });
      throw toDatabaseError(error);
    }
  }

  /**
   * Update a project's status within the supplied organisation.
   *
   * @param {string} id - Project UUID.
   * @param {ProjectStatus} status - New project status.
   * @param {string} tenantId - Owning organisation UUID.
   * @returns {Promise<ProjectResponse>} The updated project.
   * @throws {ValidationError} If an ID or status is invalid.
   * @throws {ProjectNotFoundError} If the project is not found in the tenant.
   * @throws {DatabaseError} If persistence fails.
   */
  async updateStatus(id, status, tenantId) {
    logger.debug('ProjectService.updateStatus', { projectId: id, tenantId, status });
    validateUuid(id, 'id');
    validateUuid(tenantId, 'tenantId');
    if (!PROJECT_STATUSES.has(status)) {
      throw new ValidationError('Invalid project status', ['status']);
    }

    try {
      const project = await this.projectRepository.updateStatus(id, status, tenantId);
      if (!project) {
        throw new ProjectNotFoundError();
      }
      logger.info('Project status updated', { projectId: id, tenantId, status });
      return toProjectResponse(project);
    } catch (error) {
      if (error instanceof ProjectNotFoundError) {
        throw error;
      }
      logger.error('Failed to update project status', { projectId: id, tenantId, error: error.message });
      throw toDatabaseError(error);
    }
  }

  /**
   * Get a paginated list of projects for a team in the supplied organisation.
   *
   * @param {string} teamId - Team UUID.
   * @param {string} tenantId - Owning organisation UUID.
   * @param {{page?: number, limit?: number}} [pagination] - Page (default 1) and limit (default 50, max 100).
   * @returns {Promise<PaginatedProjectListResponse>} Matching projects and pagination details.
   * @throws {ValidationError} If identifiers or pagination values are invalid.
   * @throws {DatabaseError} If persistence fails.
   */
  async getByTeam(teamId, tenantId, pagination = {}) {
    if (!pagination || typeof pagination !== 'object' || Array.isArray(pagination)) {
      throw new ValidationError('Invalid pagination options', ['pagination']);
    }
    const { page = 1, limit = 50 } = pagination;
    logger.debug('ProjectService.getByTeam', { teamId, tenantId, page, limit });
    validateUuid(teamId, 'teamId');
    validateUuid(tenantId, 'tenantId');
    if (!Number.isInteger(page) || page < 1) {
      throw new ValidationError('Page must be a positive integer', ['page']);
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be an integer between 1 and 100', ['limit']);
    }

    try {
      const result = await this.projectRepository.findByTeam(teamId, tenantId, { page, limit });
      const projects = result.rows.map(toProjectResponse);
      const total = result.count;
      logger.debug('Projects retrieved', { teamId, tenantId, count: projects.length, total });
      return {
        projects,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Failed to get projects by team', { teamId, tenantId, error: error.message });
      throw toDatabaseError(error);
    }
  }

  /**
   * Soft-delete a project within the supplied organisation.
   *
   * @param {string} id - Project UUID.
   * @param {string} tenantId - Owning organisation UUID.
   * @returns {Promise<void>} Resolves when the project has been soft-deleted.
   * @throws {ValidationError} If an ID is invalid.
   * @throws {ProjectNotFoundError} If the project is not found in the tenant.
   * @throws {DatabaseError} If persistence fails.
   */
  async delete(id, tenantId) {
    logger.debug('ProjectService.delete', { projectId: id, tenantId });
    validateUuid(id, 'id');
    validateUuid(tenantId, 'tenantId');

    try {
      const deleted = await this.projectRepository.delete(id, tenantId);
      if (!deleted) {
        throw new ProjectNotFoundError();
      }
      logger.info('Project soft-deleted', { projectId: id, tenantId });
    } catch (error) {
      if (error instanceof ProjectNotFoundError) {
        throw error;
      }
      logger.error('Failed to delete project', { projectId: id, tenantId, error: error.message });
      throw toDatabaseError(error);
    }
  }
}

module.exports = ProjectService;
