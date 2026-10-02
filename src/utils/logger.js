/**
 * Write a structured log record.
 *
 * @param {'debug'|'info'|'warn'|'error'} level - Log severity.
 * @param {string} message - Event description.
 * @param {Object} [context] - Structured event context.
 * @returns {void}
 */
function writeLog(level, message, context = {}) {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  });
  const output = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  output(record);
}

module.exports = Object.freeze({
  debug: (message, context) => writeLog('debug', message, context),
  info: (message, context) => writeLog('info', message, context),
  warn: (message, context) => writeLog('warn', message, context),
  error: (message, context) => writeLog('error', message, context)
});
