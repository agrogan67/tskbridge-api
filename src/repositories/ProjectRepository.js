const Project = require('../models/Project');
const { DatabaseError, ProjectNotFoundError, ValidationError } = require('../errors/AppErrors');
const logger = require('../utils/logger');

const MAX_LIMIT = 100;

/**
 * Data access for tenant-scoped projects.
 */
class ProjectRepository {
  /**
   * Create a repository.
   * @param {import('sequelize').ModelStatic<import('sequelize').Model>} [projectModel=Project] - Sequelize Project model.
   */
  constructor(projectModel = Project) {
    this.Project = projectModel;
  }

  /**
   * Insert a project for the specified tenant.
   * @param {{name: string, description?: string, teamId: string}} projectData - Project fields.
   * @param {string} tenantId - Owning tenant ID.
   * @returns {Promise<import('sequelize').Model>} The created project.
   * @throws {ValidationError} If the tenant ID or project name is invalid.
   * @throws {DatabaseError} If the database operation fails.
   */
  async create(projectData, tenantId) {
    logger.debug('ProjectRepository.create', { tenantId });
    if (typeof tenantId !== 'string' || !tenantId.trim()) {
      throw new ValidationError('Invalid project data', ['tenantId']);
    }
    if (!projectData || typeof projectData.name !== 'string' ||
        !projectData.name.trim() || projectData.name.trim().length > 255) {
      throw new ValidationError('Invalid project data', ['name']);
    }

    try {
      const project = await this.Project.create({
        name: projectData.name,
        description: projectData.description,
        teamId: projectData.teamId,
        tenantId
      });
      logger.debug('ProjectRepository.create completed', { tenantId, projectId: project.id });
      return project;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      logger.error('ProjectRepository.create failed', { tenantId, error });
      throw new DatabaseError('Failed to create project', error);
    }
  }

  /**
   * Find a project belonging to the specified tenant.
   * @param {string} id - Project ID.
   * @param {string} tenantId - Owning tenant ID.
   * @returns {Promise<import('sequelize').Model>} The project.
   * @throws {ProjectNotFoundError} If no matching project exists.
   * @throws {ValidationError} If tenantId is invalid.
   * @throws {DatabaseError} If the database operation fails.
   */
  async findById(id, tenantId) {
    logger.debug('ProjectRepository.findById', { projectId: id, tenantId });
    this._validateTenantId(tenantId);
    try {
      const project = await this.Project.findOne({ where: { id, tenantId } });
      if (!project) throw new ProjectNotFoundError();
      logger.debug('ProjectRepository.findById completed', { projectId: id, tenantId });
      return project;
    } catch (error) {
      if (error instanceof ProjectNotFoundError || error instanceof ValidationError) throw error;
      logger.error('ProjectRepository.findById failed', { projectId: id, tenantId, error });
      throw new DatabaseError('Failed to retrieve project', error);
    }
  }

  /**
   * Find active projects for a team with bounded pagination.
   * @param {string} teamId - Team ID.
   * @param {string} tenantId - Owning tenant ID.
   * @param {{page?: number, limit?: number}} [options={}] - Pagination options.
   * @returns {Promise<{projects: import('sequelize').Model[], pagination: {page: number, limit: number, total: number}}>} Projects and pagination metadata.
   * @throws {ValidationError} If tenantId or pagination options are invalid.
   * @throws {DatabaseError} If the database operation fails.
   */
  async findByTeam(teamId, tenantId, { page = 1, limit = 50 } = {}) {
    logger.debug('ProjectRepository.findByTeam', { teamId, tenantId, page, limit });
    this._validateTenantId(tenantId);
    if (!Number.isSafeInteger(page) || page < 1 ||
        !Number.isSafeInteger(limit) || limit < 1) {
      throw new ValidationError('Invalid pagination options', ['page', 'limit']);
    }
    const boundedLimit = Math.min(limit, MAX_LIMIT);

    try {
      const result = await this.Project.findAndCountAll({
        where: { teamId, tenantId, status: Project.PROJECT_STATUSES.ACTIVE },
        limit: boundedLimit,
        offset: (page - 1) * boundedLimit,
        order: [['createdAt', 'DESC']]
      });
      logger.debug('ProjectRepository.findByTeam completed', {
        teamId,
        tenantId,
        count: result.rows.length,
        total: result.count
      });
      return {
        projects: result.rows,
        pagination: { page, limit: boundedLimit, total: result.count }
      };
    } catch (error) {
      logger.error('ProjectRepository.findByTeam failed', { teamId, tenantId, error });
      throw new DatabaseError('Failed to retrieve projects', error);
    }
  }

  /**
   * Change only the status of a tenant-owned project.
   * @param {string} id - Project ID.
   * @param {string} status - New project status.
   * @param {string} tenantId - Owning tenant ID.
   * @returns {Promise<import('sequelize').Model>} The updated project.
   * @throws {ValidationError} If tenantId or status is invalid.
   * @throws {ProjectNotFoundError} If no matching project exists.
   * @throws {DatabaseError} If the database operation fails.
   */
  async updateStatus(id, status, tenantId) {
    logger.debug('ProjectRepository.updateStatus', { projectId: id, tenantId });
    this._validateTenantId(tenantId);
    if (!Object.values(Project.PROJECT_STATUSES).includes(status)) {
      throw new ValidationError('Invalid project status', ['status']);
    }
    try {
      const [updatedCount] = await this.Project.update(
        { status },
        { where: { id, tenantId } }
      );
      if (!updatedCount) throw new ProjectNotFoundError();
      const project = await this.Project.findOne({ where: { id, tenantId } });
      if (!project) throw new ProjectNotFoundError();
      logger.debug('ProjectRepository.updateStatus completed', { projectId: id, tenantId });
      return project;
    } catch (error) {
      if (error instanceof ProjectNotFoundError || error instanceof ValidationError) throw error;
      logger.error('ProjectRepository.updateStatus failed', { projectId: id, tenantId, error });
      throw new DatabaseError('Failed to update project status', error);
    }
  }

  /**
   * Soft-delete a tenant-owned project.
   * @param {string} id - Project ID.
   * @param {string} tenantId - Owning tenant ID.
   * @returns {Promise<void>} Resolves when the project is deleted.
   * @throws {ProjectNotFoundError} If no matching project exists.
   * @throws {ValidationError} If tenantId is invalid.
   * @throws {DatabaseError} If the database operation fails.
   */
  async softDelete(id, tenantId) {
    logger.debug('ProjectRepository.softDelete', { projectId: id, tenantId });
    this._validateTenantId(tenantId);
    try {
      const deletedCount = await this.Project.destroy({ where: { id, tenantId } });
      if (!deletedCount) throw new ProjectNotFoundError();
      logger.debug('ProjectRepository.softDelete completed', { projectId: id, tenantId });
    } catch (error) {
      if (error instanceof ProjectNotFoundError || error instanceof ValidationError) throw error;
      logger.error('ProjectRepository.softDelete failed', { projectId: id, tenantId, error });
      throw new DatabaseError('Failed to delete project', error);
    }
  }

  /**
   * Reject missing tenant IDs before constructing any database query.
   * @private
   * @param {string} tenantId - Tenant ID to validate.
   * @returns {void}
   * @throws {ValidationError} If tenantId is missing or empty.
   */
  _validateTenantId(tenantId) {
    if (typeof tenantId !== 'string' || !tenantId.trim()) {
      throw new ValidationError('Invalid tenant', ['tenantId']);
    }
  }
}

module.exports = ProjectRepository;
