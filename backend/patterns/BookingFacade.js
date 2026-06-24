/**
 * Facade pattern.
 *
 * Placing a booking touches several subsystems: validation/pricing (service
 * layer), optional add-on pricing (Decorator), payment (Adapter), seat
 * deduction (service layer), and lifecycle notifications (Observer). The
 * controller should not have to know how those fit together.
 *
 * BookingFacade exposes ONE simple method — placeBooking() / cancelBooking() —
 * and hides the orchestration of all those submodules behind it. The HTTP
 * controller is left to deal only with persistence and the request/response.
 */

const { validateAndPrice, applySeatDeduction, restoreSeats } = require('../services/bookingService');
const { getPaymentGateway } = require('./PaymentAdapter');     // Adapter
const { buildPrice } = require('./ticketPricing');             // Decorator
const { bookingNotifier } = require('./BookingNotifier');      // Observer
const logger = require('./Logger');                            // Singleton

class BookingFacade {
  /**
   * @param {object} deps - injectable collaborators (defaults to the shared ones),
   *                        which keeps the facade unit-testable without a DB.
   */
  constructor({
    gatewayFactory = getPaymentGateway,
    notifier = bookingNotifier,
  } = {}) {
    this.gatewayFactory = gatewayFactory;
    this.notifier = notifier;
  }

  /**
   * Validate, price (with optional add-ons), charge, deduct seats and announce.
   * Does NOT persist — it returns everything the controller needs to save.
   *
   * @returns {{ ok:boolean, status?:number, message?:string,
   *             totalAmount?:number, breakdown?:string,
   *             bookedTickets?:Array, payment?:object }}
   */
  placeBooking({ event, tickets, paymentProvider = 'stripe', addOns = {} }) {
    // 1) Validation + base pricing (service layer)
    const result = validateAndPrice(event, tickets);
    if (!result.ok) return result;

    // 2) Optional add-ons / discounts (Decorator)
    const { total, breakdown } = buildPrice(result.totalAmount, addOns);

    // 3) Payment through a provider-agnostic gateway (Adapter)
    const gateway = this.gatewayFactory(paymentProvider);
    const payment = gateway.charge({ amount: total, currency: 'AUD' });
    if (!payment.success) {
      return { ok: false, status: 402, message: 'Payment failed' };
    }

    // 4) Seat deduction (service layer; caller persists the event)
    applySeatDeduction(event, result.bookedTickets);

    return {
      ok: true,
      totalAmount: total,
      breakdown,
      bookedTickets: result.bookedTickets,
      payment,
    };
  }

  /** Announce a created booking to all observers (Observer). */
  announceCreated(booking) {
    this.notifier.notify('booking.created', { booking });
  }

  /**
   * Restore seats for a cancelled booking and announce it. The caller persists.
   */
  cancelBooking({ event, bookedTickets, booking }) {
    if (event) restoreSeats(event, bookedTickets);
    this.notifier.notify('booking.cancelled', { booking });
    logger.info('Facade processed cancellation', { bookingId: booking?.id });
  }
}

module.exports = { BookingFacade };
