const { DatabaseError } = require('../errors/AppErrors');

/**
 * Project persistence operations. Every query is scoped to its tenant.
 */
class ProjectRepository {
  /**
   * Create a project repository.
   *
   * @param {import('sequelize').Model} projectModel - Configured Sequelize Project model.
   */
  constructor(projectModel) {
    this.projectModel = projectModel;
  }

  /**
   * Persist a project belonging to the supplied tenant.
   *
   * @param {Object} projectData - Project fields to persist.
   * @param {string} tenantId - Owning organisation UUID.
   * @returns {Promise<import('sequelize').Model>} The created project.
   * @throws {DatabaseError} If persistence fails.
   */
  async create(projectData, tenantId) {
    try {
      return await this.projectModel.create({ ...projectData, tenantId });
    } catch (error) {
      throw new DatabaseError('Database operation failed', error);
    }
  }

  /**
   * Find and update a project status within the supplied tenant.
   *
   * @param {string} id - Project UUID.
   * @param {string} status - New project status.
   * @param {string} tenantId - Owning organisation UUID.
   * @returns {Promise<import('sequelize').Model|null>} The updated project, or null if absent.
   * @throws {DatabaseError} If persistence fails.
   */
  async updateStatus(id, status, tenantId) {
    try {
      const project = await this.projectModel.findOne({ where: { id, tenantId } });
      if (!project) {
        return null;
      }

      await project.update({ status });
      return project;
    } catch (error) {
      throw new DatabaseError('Database operation failed', error);
    }
  }

  /**
   * Find tenant-owned projects for a team, newest first.
   *
   * @param {string} teamId - Team UUID.
   * @param {string} tenantId - Owning organisation UUID.
   * @param {{page: number, limit: number}} pagination - Page and page size.
   * @returns {Promise<{rows: import('sequelize').Model[], count: number}>} Matching projects and total count.
   * @throws {DatabaseError} If persistence fails.
   */
  async findByTeam(teamId, tenantId, { page, limit }) {
    try {
      return await this.projectModel.findAndCountAll({
        where: { teamId, tenantId },
        order: [['createdAt', 'DESC']],
        limit,
        offset: (page - 1) * limit
      });
    } catch (error) {
      throw new DatabaseError('Database operation failed', error);
    }
  }

  /**
   * Soft-delete a project within the supplied tenant.
   *
   * @param {string} id - Project UUID.
   * @param {string} tenantId - Owning organisation UUID.
   * @returns {Promise<boolean>} Whether a project was deleted.
   * @throws {DatabaseError} If persistence fails.
   */
  async delete(id, tenantId) {
    try {
      const project = await this.projectModel.findOne({ where: { id, tenantId } });
      if (!project) {
        return false;
      }

      await project.destroy();
      return true;
    } catch (error) {
      throw new DatabaseError('Database operation failed', error);
    }
  }
}

module.exports = ProjectRepository;
