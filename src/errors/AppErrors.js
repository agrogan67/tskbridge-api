/**
 * Custom Application Errors
 * Type-safe error classes for different error scenarios
 */

/**
 * Base application error
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date();
  }
}

/**
 * Validation error - 400 Bad Request
 * @class ValidationError
 * @extends AppError
 * @property {string[]} fields - Array of field names with validation issues
 */
class ValidationError extends AppError {
  constructor(message, fields = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.fields = fields;
  }
}

/**
 * Resource not found error - 404 Not Found
 * @class ProjectNotFoundError
 * @extends AppError
 */
class ProjectNotFoundError extends AppError {
  constructor(message = 'Project not found') {
    super(message, 404, 'PROJECT_NOT_FOUND');
  }
}

/**
 * Tenant authorization error - 403 Forbidden
 * @class TenantAuthorizationError
 * @extends AppError
 */
class TenantAuthorizationError extends AppError {
  constructor(message = 'Access denied: resource belongs to different tenant') {
    super(message, 403, 'TENANT_AUTHORIZATION_ERROR');
  }
}

/**
 * Rate limit error - 429 Too Many Requests
 * @class RateLimitError
 * @extends AppError
 */
class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', retryAfter = 60) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
  }
}

/**
 * Database error - 500 Internal Server Error
 * @class DatabaseError
 * @extends AppError
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

module.exports = {
  AppError,
  ValidationError,
  ProjectNotFoundError,
  TenantAuthorizationError,
  RateLimitError,
  DatabaseError
};
