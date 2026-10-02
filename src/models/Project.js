const sequelize = require('../database/Database');
const { DataTypes } = require('sequelize');

/**
 * Project lifecycle states.
 * @enum {string}
 */
const PROJECT_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED',
  ON_HOLD: 'ON_HOLD'
});

/**
 * Sequelize model for a tenant-owned project.
 * @type {import('sequelize').ModelStatic<import('sequelize').Model>}
 */
const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  description: {
    type: DataTypes.STRING(5000),
    allowNull: true,
    validate: {
      len: [0, 5000]
    }
  },
  teamId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'team_id',
    references: {
      model: 'teams',
      key: 'id'
    }
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id'
  },
  status: {
    type: DataTypes.ENUM(...Object.values(PROJECT_STATUSES)),
    allowNull: false,
    defaultValue: PROJECT_STATUSES.ACTIVE
  }
}, {
  tableName: 'projects',
  timestamps: true,
  paranoid: true,
  underscored: true
});

module.exports = Project;
module.exports.PROJECT_STATUSES = PROJECT_STATUSES;
