/**
 * Singleton pattern.
 *
 * A single shared logger instance is used throughout the backend. The module
 * caches the instance so every `require('./patterns/Logger')` returns the very
 * same object, giving one consistent log buffer and configuration.
 */
class Logger {
  constructor() {
    if (Logger._instance) return Logger._instance;
    this.entries = [];
    this.level = process.env.LOG_LEVEL || 'info';
    Logger._instance = this;
  }

  log(level, message, meta = {}) {
    const entry = { ts: new Date().toISOString(), level, message, meta };
    this.entries.push(entry);
    // eslint-disable-next-line no-console
    console.log(`[${entry.ts}] ${level.toUpperCase()} ${message}`);
    return entry;
  }

  info(msg, meta) { return this.log('info', msg, meta); }
  warn(msg, meta) { return this.log('warn', msg, meta); }
  error(msg, meta) { return this.log('error', msg, meta); }
}

// Export the single shared instance.
module.exports = new Logger();
