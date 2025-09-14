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
  if (process.env.NODE_ENV === 'production' && level === 'debug') return;
  console[level === 'error' ? 'error' : 'log'](`${color}${formatted}${reset}`);
}

module.exports = {
  info: (msg) => log('info', msg),
  warn: (msg) => log('warn', msg),
  error: (msg) => log('error', msg),
  debug: (msg) => log('debug', msg),
  agent: (msg) => log('info', `[AGENT] ${msg}`),
  api: (msg) => log('info', `[API] ${msg}`),
  result: (msg) => log('info', `[RESULT] ${msg}`),
  stack: (err) => log('error', err.stack || err),
};
