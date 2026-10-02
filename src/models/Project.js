/**
 * Define the Sequelize Project model.
 *
 * @param {import('sequelize').Sequelize} sequelize - Database connection.
 * @returns {import('sequelize').Model} The configured Project model.
 */
function defineProjectModel(sequelize) {
  const { DataTypes } = require('sequelize');

  return sequelize.define('Project', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      set(value) {
        this.setDataValue('name', typeof value === 'string' ? value.trim() : value);
      },
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
      field: 'teamId'
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'tenantId'
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED', 'ON_HOLD'),
      allowNull: false,
      defaultValue: 'ACTIVE'
    }
  }, {
    tableName: 'projects',
    timestamps: true,
    paranoid: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  });
}

module.exports = defineProjectModel;
