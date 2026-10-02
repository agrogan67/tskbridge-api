const { Sequelize } = require('sequelize');

/**
 * Shared Sequelize connection configured through environment variables.
 * @type {Sequelize}
 */
const sequelize = new Sequelize({
  database: process.env.DB_NAME || 'tskbridge',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  logging: false
});

module.exports = sequelize;
