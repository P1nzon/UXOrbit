// Logger utility for UXOrbit Multi-Agent Testing Dashboard
const colors = {
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  debug: '\x1b[35m',
  reset: '\x1b[0m',
};

function timestamp() {
  return new Date().toISOString();
}

function log(level, message) {
  const color = colors[level] || '';
  const reset = colors.reset;
  const formatted = `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
  const levels = { error: 0, warn: 1, info: 2, debug: 3 };
  const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
  if (levels[level] > levels[LOG_LEVEL]) return;
  console[level === 'error' ? 'error' : 'log'](`${color}${formatted}${reset}`);
}

module.exports = {
  info: (...args) => log('info', ...args),
  warn: (...args) => log('warn', ...args),
  error: (...args) => log('error', ...args),
  debug: (...args) => log('debug', ...args),
  agent: (msg) => log('info', `[AGENT] ${msg}`),
  api: (msg) => log('info', `[API] ${msg}`),
  result: (msg) => log('info', `[RESULT] ${msg}`),
  stack: (err) => log('error', err.stack || err),
};
