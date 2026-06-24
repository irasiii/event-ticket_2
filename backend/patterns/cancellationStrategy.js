/**
 * Strategy pattern.
 *
 * Cancellation rules differ by actor. Each strategy implements the same
 * interface — isCancellationAllowed(event) -> { allowed, reason } — and the
 * appropriate one is selected at runtime, so new policies can be added without
 * changing the booking logic that uses them.
 */

class CancellationStrategy {
  // eslint-disable-next-line no-unused-vars
  isCancellationAllowed(event) {
    throw new Error('isCancellationAllowed() must be implemented by a subclass');
  }
}

/** Regular members may cancel only up to 24 hours before the event. */
class MemberCancellationStrategy extends CancellationStrategy {
  constructor(minHoursBefore = 24) {
    super();
    this.minHoursBefore = minHoursBefore;
  }

  isCancellationAllowed(event) {
    const hoursUntil = (new Date(event.date) - new Date()) / (1000 * 60 * 60);
    if (hoursUntil < this.minHoursBefore) {
      return {
        allowed: false,
        reason: `Cancellation is only allowed up to ${this.minHoursBefore} hours before the event`,
      };
    }
    return { allowed: true, reason: null };
  }
}

/** Admins may cancel any booking at any time. */
class AdminCancellationStrategy extends CancellationStrategy {
  isCancellationAllowed() {
    return { allowed: true, reason: null };
  }
}

/**
 * Selects the strategy for a given domain/persisted user (by role).
 */
function strategyForRole(role) {
  return role === 'admin'
    ? new AdminCancellationStrategy()
    : new MemberCancellationStrategy();
}

module.exports = {
  CancellationStrategy,
  MemberCancellationStrategy,
  AdminCancellationStrategy,
  strategyForRole,
};
