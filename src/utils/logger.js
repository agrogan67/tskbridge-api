/**
 * Write structured log entries with a timestamp and severity.
 * @param {string} level - Log severity.
 * @param {string} message - Log message.
 * @param {Object} [metadata={}] - Additional structured context.
 * @returns {void}
 */
function log(level, message, metadata = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata
  }, (key, value) => key === 'error' && value instanceof Error
    ? { message: value.message, stack: value.stack }
    : value);
  const output = level === 'error' ? console.error : console.log;
  output(entry);
}

/**
 * Minimal structured logger used by application services.
 * @type {{debug: Function, info: Function, warn: Function, error: Function}}
 */
module.exports = {
  debug: (message, metadata) => log('debug', message, metadata),
  info: (message, metadata) => log('info', message, metadata),
  warn: (message, metadata) => log('warn', message, metadata),
  error: (message, metadata) => log('error', message, metadata)
};
