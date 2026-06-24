/**
 * Pure, framework-free booking business logic.
 *
 * Extracted from the controller so it can be unit-tested with Mocha/Chai
 * without a database or HTTP layer. The controller calls these functions and
 * only deals with persistence and the request/response.
 */

/**
 * Validate a booking request against an event and compute priced line items.
 * Does NOT mutate the event.
 *
 * @returns {{ ok:boolean, status?:number, message?:string,
 *             totalAmount?:number, bookedTickets?:Array }}
 */
function validateAndPrice(event, tickets, now = new Date()) {
  if (!event) return { ok: false, status: 404, message: 'Event not found' };
  if (event.status !== 'published') {
    return { ok: false, status: 400, message: 'Event is not available for booking' };
  }
  if (new Date(event.date) < now) {
    return { ok: false, status: 400, message: 'Event has already passed' };
  }
  if (!Array.isArray(tickets) || tickets.length === 0) {
    return { ok: false, status: 400, message: 'eventId and tickets are required' };
  }

  let totalAmount = 0;
  const bookedTickets = [];

  for (const req of tickets) {
    const tier = (event.ticketTiers || []).find((t) => t.name === req.tierName);
    if (!tier) {
      return { ok: false, status: 400, message: `Ticket tier "${req.tierName}" not found` };
    }
    const available = tier.quantity - tier.sold;
    if (req.quantity > available) {
      return { ok: false, status: 400, message: `Only ${available} tickets left for "${tier.name}"` };
    }
    bookedTickets.push({ tierName: tier.name, quantity: req.quantity, unitPrice: tier.price });
    totalAmount += tier.price * req.quantity;
  }

  return { ok: true, totalAmount, bookedTickets };
}

/** Apply sold-seat deductions to the event's tiers (mutates a copy-safe way). */
function applySeatDeduction(event, bookedTickets) {
  for (const bt of bookedTickets) {
    const tier = event.ticketTiers.find((t) => t.name === bt.tierName);
    if (tier) tier.sold += bt.quantity;
  }
  return event;
}

/** Restore seats on cancellation. */
function restoreSeats(event, bookedTickets) {
  for (const bt of bookedTickets) {
    const tier = event.ticketTiers.find((t) => t.name === bt.tierName);
    if (tier) tier.sold = Math.max(0, tier.sold - bt.quantity);
  }
  return event;
}

module.exports = { validateAndPrice, applySeatDeduction, restoreSeats };
