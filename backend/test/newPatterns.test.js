const { expect } = require('chai');

const {
  BookingSubject, EmailObserver, LoggerObserver,
} = require('../patterns/BookingNotifier');
const {
  buildPrice, BasePrice, ServiceFeeDecorator, PromoDecorator,
} = require('../patterns/ticketPricing');
const { BookingFacade } = require('../patterns/BookingFacade');
const { EventPrototype } = require('../patterns/EventPrototype');
const {
  RealAnalyticsService, AnalyticsProxy, AccessDeniedError,
} = require('../patterns/AnalyticsProxy');

describe('Observer pattern — booking notifications', () => {
  it('broadcasts an event to every subscribed observer', () => {
    const subject = new BookingSubject();
    const seen = [];
    subject.subscribe({ update: (type) => seen.push(type) });
    subject.subscribe({ update: (type) => seen.push(`${type}:2`) });

    subject.notify('booking.created', { booking: { id: 'b1' } });
    expect(seen).to.deep.equal(['booking.created', 'booking.created:2']);
  });

  it('stops notifying after unsubscribe', () => {
    const subject = new BookingSubject();
    let count = 0;
    const unsubscribe = subject.subscribe({ update: () => { count += 1; } });
    subject.notify('booking.created');
    unsubscribe();
    subject.notify('booking.created');
    expect(count).to.equal(1);
  });

  it('isolates observer failures from the rest', () => {
    const subject = new BookingSubject();
    let reached = false;
    subject.subscribe({ update: () => { throw new Error('boom'); } });
    subject.subscribe({ update: () => { reached = true; } });
    subject.notify('booking.created');
    expect(reached).to.equal(true);
  });

  it('default observers conform to the observer interface', () => {
    expect(new EmailObserver().update).to.be.a('function');
    expect(new LoggerObserver().update).to.be.a('function');
  });
});

describe('Decorator pattern — ticket pricing add-ons', () => {
  it('returns the bare subtotal with no decorators', () => {
    expect(buildPrice(100).total).to.equal(100);
  });

  it('stacks a service fee on top of the subtotal', () => {
    expect(buildPrice(100, { serviceFeePct: 5 }).total).to.equal(105);
  });

  it('applies protection fee and promo discount in combination', () => {
    // 100 -> +5% fee = 105 -> +4.95 protection = 109.95 -> -10% promo = 98.955 -> 98.96
    const { total, breakdown } = buildPrice(100, {
      serviceFeePct: 5, protection: true, promo: { pct: 10, code: 'SAVE10' },
    });
    expect(total).to.equal(98.96);
    expect(breakdown).to.match(/Service fee/).and.to.match(/SAVE10/);
  });

  it('each decorator preserves the price()/describe() interface', () => {
    const decorated = new PromoDecorator(new ServiceFeeDecorator(new BasePrice(50), 10), 20);
    expect(decorated.price).to.be.a('function');
    expect(decorated.describe()).to.be.a('string');
  });
});

describe('Facade pattern — booking flow orchestration', () => {
  const makeEvent = () => ({
    status: 'published',
    date: new Date(Date.now() + 72 * 60 * 60 * 1000),
    ticketTiers: [{ name: 'GA', price: 50, quantity: 10, sold: 0 }],
  });

  it('validates, prices, charges and deducts seats in one call', () => {
    const facade = new BookingFacade();
    const event = makeEvent();
    const result = facade.placeBooking({
      event, tickets: [{ tierName: 'GA', quantity: 2 }], paymentProvider: 'stripe',
    });
    expect(result.ok).to.equal(true);
    expect(result.totalAmount).to.equal(100);
    expect(result.payment.success).to.equal(true);
    expect(event.ticketTiers[0].sold).to.equal(2); // seats deducted
  });

  it('surfaces validation failures from the service layer', () => {
    const facade = new BookingFacade();
    const event = makeEvent();
    const result = facade.placeBooking({ event, tickets: [{ tierName: 'GA', quantity: 999 }] });
    expect(result.ok).to.equal(false);
    expect(result.status).to.equal(400);
  });

  it('returns a payment failure when the gateway declines', () => {
    const declining = () => ({ charge: () => ({ success: false }) });
    const facade = new BookingFacade({ gatewayFactory: declining });
    const result = facade.placeBooking({
      event: makeEvent(), tickets: [{ tierName: 'GA', quantity: 1 }],
    });
    expect(result.ok).to.equal(false);
    expect(result.status).to.equal(402);
  });
});

describe('Prototype pattern — event cloning', () => {
  const template = {
    title: 'Weekly Jazz Night',
    status: 'published',
    ticketTiers: [{ name: 'GA', price: 30, quantity: 100, sold: 40 }],
    toObject() { return JSON.parse(JSON.stringify(this)); },
  };

  it('clones with sold counts reset and status back to draft', () => {
    const clone = new EventPrototype(template).clone();
    expect(clone.status).to.equal('draft');
    expect(clone.ticketTiers[0].sold).to.equal(0);
    expect(clone.ticketTiers[0].price).to.equal(30);
  });

  it('applies overrides and is independent of the prototype', () => {
    const clone = new EventPrototype(template).clone({ title: 'NYE Special' });
    clone.ticketTiers[0].price = 99;
    expect(clone.title).to.equal('NYE Special');
    expect(template.ticketTiers[0].price).to.equal(30); // unchanged — deep copy
  });
});

describe('Proxy pattern — analytics access control', () => {
  const real = new RealAnalyticsService(async () => ({ totalRevenue: 1234 }));

  it('lets an admin through to the real service', async () => {
    const data = await new AnalyticsProxy(real).getAnalytics({ role: 'admin', id: 'a1' });
    expect(data.totalRevenue).to.equal(1234);
  });

  it('blocks a non-admin with an access-denied error', async () => {
    try {
      await new AnalyticsProxy(real).getAnalytics({ role: 'user' });
      throw new Error('should not reach here');
    } catch (err) {
      expect(err).to.be.instanceOf(AccessDeniedError);
      expect(err.status).to.equal(403);
    }
  });

  it('blocks anonymous (no requester) access', async () => {
    let denied = false;
    try {
      await new AnalyticsProxy(real).getAnalytics();
    } catch (err) {
      denied = err instanceof AccessDeniedError;
    }
    expect(denied).to.equal(true);
  });
});
