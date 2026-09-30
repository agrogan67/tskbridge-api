/**
 * Request ID Middleware
 * Generates unique request ID for tracing across logs
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Request ID middleware
 * Generates or extracts request ID and attaches to request object
 * Useful for distributed tracing and log correlation
 * @param {express.Request} req - Express request
 * @param {express.Response} res - Express response
 * @param {Function} next - Express next middleware
 */
function requestIdMiddleware(req, res, next) {
  // Try to extract from headers (if passed by upstream service)
  const requestId = req.headers['x-request-id'] || uuidv4();

  req.id = requestId;

  // Include in response headers for client correlation
  res.setHeader('X-Request-ID', requestId);

  next();
}

module.exports = {
  requestIdMiddleware
};
