/**
 * Proxy pattern.
 *
 * Revenue and analytics are sensitive: only admins may read them. Rather than
 * sprinkling role checks through the controller, we put a protection proxy in
 * front of the real analytics service. The proxy implements the SAME interface
 * as the real subject (getAnalytics) but performs an access check first and
 * only then delegates to the real object. It also adds a small audit log —
 * extra behaviour the caller gets for free.
 *
 *   Subject : AnalyticsService (interface)
 *   Real    : RealAnalyticsService (does the actual data work)
 *   Proxy   : AnalyticsProxy (guards access, then delegates)
 */

const logger = require('./Logger'); // Singleton

/** Subject interface. */
class AnalyticsService {
  // eslint-disable-next-line no-unused-vars
  async getAnalytics(requester) {
    throw new Error('getAnalytics() must be implemented');
  }
}

/**
 * The real service. `compute` is injected so this stays free of any direct DB
 * dependency and can be unit-tested. In the controller we pass the function
 * that runs the Mongo aggregations.
 */
class RealAnalyticsService extends AnalyticsService {
  constructor(compute) {
    super();
    this.compute = compute; // async () => ({ totalRevenue, ... })
  }

  async getAnalytics() {
    return this.compute();
  }
}

/** Raised when a non-admin attempts to read protected analytics. */
class AccessDeniedError extends Error {
  constructor(message = 'Access denied — analytics are restricted to admins') {
    super(message);
    this.name = 'AccessDeniedError';
    this.status = 403;
  }
}

/** Protection proxy — checks the requester's role before delegating. */
class AnalyticsProxy extends AnalyticsService {
  constructor(real) {
    super();
    this.real = real;
  }

  async getAnalytics(requester) {
    if (!requester || requester.role !== 'admin') {
      logger.warn('Blocked analytics access', { role: requester?.role || 'anonymous' });
      throw new AccessDeniedError();
    }
    logger.info('Analytics access granted', { user: requester.id || requester._id });
    return this.real.getAnalytics();
  }
}

module.exports = {
  AnalyticsService,
  RealAnalyticsService,
  AnalyticsProxy,
  AccessDeniedError,
};
