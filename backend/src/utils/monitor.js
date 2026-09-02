const Sentry = require('@sentry/node');
const NewRelic = require('newrelic');
const logger = require('./logger');

class Monitor {
  constructor() {
    // Initialize Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 1.0,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express()
        ]
      });
    }

    // Initialize New Relic
    if (process.env.NEW_RELIC_LICENSE_KEY) {
      NewRelic.instrumentExpress();
    }
  }

  // Error tracking
  captureError(error, context = {}) {
    logger.error('Error captured:', { error, context });

    if (process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
        Sentry.captureException(error);
      });
    }
  }

  // Performance monitoring
  startTransaction(name, context = {}) {
    if (process.env.NEW_RELIC_LICENSE_KEY) {
      return NewRelic.startTransaction(name, context);
    }
    return null;
  }

  // Custom metrics
  recordMetric(name, value, attributes = {}) {
    if (process.env.NEW_RELIC_LICENSE_KEY) {
      NewRelic.recordMetric(name, value, attributes);
    }
  }

  // Custom events
  recordEvent(name, attributes = {}) {
    if (process.env.NEW_RELIC_LICENSE_KEY) {
      NewRelic.recordCustomEvent(name, attributes);
    }
  }

  // Request tracing
  startWebTransaction(name, handler) {
    if (process.env.NEW_RELIC_LICENSE_KEY) {
      return NewRelic.startWebTransaction(name, handler);
    }
    return handler();
  }

  // Database monitoring
  startDatabaseTransaction(name, query, parameters = []) {
    if (process.env.NEW_RELIC_LICENSE_KEY) {
      return NewRelic.startDatastoreSegment(name, query, parameters);
    }
    return null;
  }

  // Memory monitoring
  getMemoryUsage() {
    const used = process.memoryUsage();
    return {
      rss: this.formatBytes(used.rss),
      heapTotal: this.formatBytes(used.heapTotal),
      heapUsed: this.formatBytes(used.heapUsed),
      external: this.formatBytes(used.external)
    };
  }

  // CPU monitoring
  getCPUUsage() {
    const startUsage = process.cpuUsage();
    return new Promise((resolve) => {
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        resolve({
          user: endUsage.user / 1000000, // Convert to seconds
          system: endUsage.system / 1000000 // Convert to seconds
        });
      }, 100);
    });
  }

  // Helper method to format bytes
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Health check
  async checkHealth() {
    const memory = this.getMemoryUsage();
    const cpu = await this.getCPUUsage();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory,
      cpu,
      database: {
        connected: mongoose.connection.readyState === 1,
        state: mongoose.connection.readyState
      },
      redis: {
        connected: redisClient.isOpen
      }
    };
  }
}

// Create a singleton instance
const monitor = new Monitor();

module.exports = monitor; 