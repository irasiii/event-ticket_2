const { expect } = require('chai');
const { validateAndPrice, applySeatDeduction, restoreSeats } = require('../services/bookingService');

const makeEvent = (over = {}) => ({
  status: 'published',
  date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // a week away
  ticketTiers: [
    { name: 'General', price: 50, quantity: 100, sold: 90 },
    { name: 'VIP', price: 150, quantity: 10, sold: 0 },
  ],
  ...over,
});

describe('bookingService.validateAndPrice', () => {
  it('rejects an unpublished event', () => {
    const r = validateAndPrice(makeEvent({ status: 'draft' }), [{ tierName: 'VIP', quantity: 1 }]);
    expect(r.ok).to.equal(false);
    expect(r.status).to.equal(400);
  });

  it('rejects a past event', () => {
    const r = validateAndPrice(makeEvent({ date: new Date(Date.now() - 1000) }), [{ tierName: 'VIP', quantity: 1 }]);
    expect(r.ok).to.equal(false);
    expect(r.message).to.match(/passed/);
  });

  it('rejects a missing event with 404', () => {
    const r = validateAndPrice(null, [{ tierName: 'VIP', quantity: 1 }]);
    expect(r.status).to.equal(404);
  });

  it('rejects an unknown tier', () => {
    const r = validateAndPrice(makeEvent(), [{ tierName: 'Nope', quantity: 1 }]);
    expect(r.ok).to.equal(false);
    expect(r.message).to.match(/not found/);
  });

  it('prevents overselling beyond (quantity - sold)', () => {
    const r = validateAndPrice(makeEvent(), [{ tierName: 'General', quantity: 11 }]); // only 10 left
    expect(r.ok).to.equal(false);
    expect(r.message).to.contain('Only 10 tickets left');
  });

  it('computes the correct total for a valid multi-tier order', () => {
    const r = validateAndPrice(makeEvent(), [
      { tierName: 'General', quantity: 2 },
      { tierName: 'VIP', quantity: 1 },
    ]);
    expect(r.ok).to.equal(true);
    expect(r.totalAmount).to.equal(2 * 50 + 150); // 250
    expect(r.bookedTickets).to.have.length(2);
  });
});

describe('bookingService seat inventory', () => {
  it('deducts then restores seats symmetrically', () => {
    const ev = makeEvent();
    applySeatDeduction(ev, [{ tierName: 'VIP', quantity: 3 }]);
    expect(ev.ticketTiers.find((t) => t.name === 'VIP').sold).to.equal(3);
    restoreSeats(ev, [{ tierName: 'VIP', quantity: 3 }]);
    expect(ev.ticketTiers.find((t) => t.name === 'VIP').sold).to.equal(0);
  });

  it('never restores below zero', () => {
    const ev = makeEvent();
    restoreSeats(ev, [{ tierName: 'VIP', quantity: 5 }]);
    expect(ev.ticketTiers.find((t) => t.name === 'VIP').sold).to.equal(0);
  });
});
