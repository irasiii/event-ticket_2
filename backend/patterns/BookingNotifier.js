/**
 * Observer pattern.
 *
 * When a booking is created or cancelled, several unrelated things may need to
 * react (e-mail the customer, write an audit log, push an in-app alert, …).
 * Instead of hard-wiring those calls into the booking logic, the booking flow
 * publishes an event to a Subject, and any number of Observers subscribe to it.
 * New reactions can be added by registering another observer — the publisher
 * never changes.
 *
 *   Subject  : BookingSubject (keeps the observer list, broadcasts events)
 *   Observers: EmailObserver, LoggerObserver  (implement update(event, data))
 */

const logger = require('./Logger'); // reuse the Singleton logger

/** Observer interface — every observer implements update(). */
class BookingObserver {
  // eslint-disable-next-line no-unused-vars
  update(eventType, payload) {
    throw new Error('update() must be implemented by a concrete observer');
  }
}

/**
 * Sends a (simulated) e-mail to the customer. No real network call is made —
 * it records the message through the shared logger so it is observable in tests.
 */
class EmailObserver extends BookingObserver {
  update(eventType, { booking } = {}) {
    const to = booking?.userEmail || 'customer';
    const subject =
      eventType === 'booking.created'
        ? 'Your booking is confirmed'
        : 'Your booking was cancelled';
    logger.info(`[email] -> ${to}: ${subject}`, { bookingId: booking?.id });
    return { to, subject };
  }
}

/** Writes a structured audit entry for every booking lifecycle event. */
class LoggerObserver extends BookingObserver {
  update(eventType, { booking } = {}) {
    logger.info(`[audit] ${eventType}`, { bookingId: booking?.id });
  }
}

/** The Subject — holds observers and broadcasts events to all of them. */
class BookingSubject {
  constructor() {
    this._observers = [];
  }

  subscribe(observer) {
    if (typeof observer?.update !== 'function') {
      throw new Error('Observer must implement update()');
    }
    this._observers.push(observer);
    return () => this.unsubscribe(observer); // handy unsubscribe handle
  }

  unsubscribe(observer) {
    this._observers = this._observers.filter((o) => o !== observer);
  }

  /** Broadcast an event to every subscribed observer. */
  notify(eventType, payload = {}) {
    for (const observer of this._observers) {
      try {
        observer.update(eventType, payload);
      } catch (err) {
        logger.error('Observer failed', { error: err.message });
      }
    }
  }
}

/**
 * A ready-to-use subject with the default observers attached, shared across the
 * app. Tests can still build their own BookingSubject in isolation.
 */
const bookingNotifier = new BookingSubject();
bookingNotifier.subscribe(new EmailObserver());
bookingNotifier.subscribe(new LoggerObserver());

module.exports = {
  BookingObserver,
  EmailObserver,
  LoggerObserver,
  BookingSubject,
  bookingNotifier,
};
