const ProjectRepository = require('../repositories/ProjectRepository');
const { PROJECT_STATUSES } = require('../models/Project');
const { DatabaseError, ProjectNotFoundError, ValidationError } = require('../errors/AppErrors');
const logger = require('../utils/logger');

/**
 * Project business logic and input validation.
 */
class ProjectService {
  /**
   * Create a service.
   * @param {ProjectRepository} [projectRepository] - Project data access.
   */
  constructor(projectRepository = new ProjectRepository()) {
    this.projectRepository = projectRepository;
  }

  /**
   * Validate and create a project for a tenant.
   * @param {{name: string, description?: string, teamId: string}} request - Project request.
   * @param {string} tenantId - Owning tenant ID.
   * @returns {Promise<import('sequelize').Model>} The created project.
   * @throws {ValidationError} If an input field is invalid.
   * @throws {DatabaseError} If persistence fails.
   */
  async create(request = {}, tenantId) {
    logger.debug('ProjectService.create', { tenantId });
    const fields = [];
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
      throw new ValidationError('Invalid project data', ['request']);
    }
    const { name, description, teamId } = request;
    if (typeof tenantId !== 'string' || !tenantId.trim()) fields.push('tenantId');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 255) fields.push('name');
    if (description !== undefined && description !== null &&
        (typeof description !== 'string' || description.trim().length > 5000)) {
      fields.push('description');
    }
    if (typeof teamId !== 'string' || !teamId.trim()) fields.push('teamId');
    if (fields.length) throw new ValidationError('Invalid project data', fields);

    try {
      const project = await this.projectRepository.create({
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() : description,
        teamId: teamId.trim()
      }, tenantId);
      logger.debug('ProjectService.create completed', { tenantId, projectId: project.id });
      return project;
    } catch (error) {
      this._logFailure('create', error, { tenantId });
      throw this._asDatabaseError(error, 'Failed to create project');
    }
  }

  /**
   * Validate and update a project's status.
   * @param {string} projectId - Project ID.
   * @param {string} status - New status.
   * @param {string} tenantId - Owning tenant ID.
   * @returns {Promise<import('sequelize').Model>} The updated project.
   * @throws {ValidationError} If status or tenantId is invalid.
   * @throws {ProjectNotFoundError} If the project is not found for the tenant.
   * @throws {DatabaseError} If persistence fails.
   */
  async updateStatus(projectId, status, tenantId) {
    logger.debug('ProjectService.updateStatus', { projectId, tenantId });
    if (typeof tenantId !== 'string' || !tenantId.trim()) {
      throw new ValidationError('Invalid tenant', ['tenantId']);
    }
    if (!Object.values(PROJECT_STATUSES).includes(status)) {
      throw new ValidationError('Invalid project status', ['status']);
    }
    try {
      const project = await this.projectRepository.updateStatus(projectId, status, tenantId);
      logger.debug('ProjectService.updateStatus completed', { projectId, tenantId });
      return project;
    } catch (error) {
      this._logFailure('updateStatus', error, { projectId, tenantId });
      throw this._asDatabaseError(error, 'Failed to update project status');
    }
  }

  /**
   * Retrieve a paginated list of projects for a tenant's team.
   * @param {string} teamId - Team ID.
   * @param {string} tenantId - Owning tenant ID.
   * @param {{page?: number, limit?: number}} [options={}] - Pagination options.
   * @returns {Promise<{projects: import('sequelize').Model[], pagination: {page: number, limit: number, total: number}}>} Paginated projects.
   * @throws {ValidationError} If teamId, tenantId, or pagination options are invalid.
   * @throws {DatabaseError} If retrieval fails.
   */
  async getByTeam(teamId, tenantId, options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new ValidationError('Invalid pagination options', ['options']);
    }
    const { page = 1, limit = 50 } = options;
    logger.debug('ProjectService.getByTeam', { teamId, tenantId, page, limit });
    if (typeof tenantId !== 'string' || !tenantId.trim()) {
      throw new ValidationError('Invalid tenant', ['tenantId']);
    }
    if (typeof teamId !== 'string' || !teamId.trim()) {
      throw new ValidationError('Invalid team', ['teamId']);
    }
    if (!Number.isSafeInteger(page) || page < 1 ||
        !Number.isSafeInteger(limit) || limit < 1) {
      throw new ValidationError('Invalid pagination options', ['page', 'limit']);
    }
    try {
      const result = await this.projectRepository.findByTeam(teamId.trim(), tenantId, { page, limit });
      logger.debug('ProjectService.getByTeam completed', {
        teamId,
        tenantId,
        count: result.projects.length
      });
      return result;
    } catch (error) {
      this._logFailure('getByTeam', error, { teamId, tenantId });
      throw this._asDatabaseError(error, 'Failed to retrieve projects');
    }
  }

  /**
   * Soft-delete a project belonging to a tenant.
   * @param {string} projectId - Project ID.
   * @param {string} tenantId - Owning tenant ID.
   * @returns {Promise<{message: string}>} A success message.
   * @throws {ValidationError} If tenantId is invalid.
   * @throws {ProjectNotFoundError} If the project is not found for the tenant.
   * @throws {DatabaseError} If deletion fails.
   */
  async delete(projectId, tenantId) {
    logger.debug('ProjectService.delete', { projectId, tenantId });
    if (typeof tenantId !== 'string' || !tenantId.trim()) {
      throw new ValidationError('Invalid tenant', ['tenantId']);
    }
    try {
      await this.projectRepository.softDelete(projectId, tenantId);
      logger.debug('ProjectService.delete completed', { projectId, tenantId });
      return { message: 'Project deleted successfully' };
    } catch (error) {
      this._logFailure('delete', error, { projectId, tenantId });
      throw this._asDatabaseError(error, 'Failed to delete project');
    }
  }

  /**
   * Log an operation failure without exposing it to callers.
   * @private
   * @param {string} operation - Failed operation.
   * @param {Error} error - Original error.
   * @param {Object} context - Safe contextual identifiers.
   * @returns {void}
   */
  _logFailure(operation, error, context) {
    logger.error(`ProjectService.${operation} failed`, { ...context, error });
  }

  /**
   * Preserve known application errors and safely wrap unexpected persistence errors.
   * @private
   * @param {Error} error - Original error.
   * @param {string} message - Safe message for callers.
   * @returns {Error} Application error to throw.
   */
  _asDatabaseError(error, message) {
    if (error instanceof ValidationError ||
        error instanceof ProjectNotFoundError ||
        error instanceof DatabaseError) {
      return error;
    }
    return new DatabaseError(message, error);
  }
}

module.exports = ProjectService;
