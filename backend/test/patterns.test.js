const { expect } = require('chai');
const {
  strategyForRole, MemberCancellationStrategy, AdminCancellationStrategy,
} = require('../patterns/cancellationStrategy');
const {
  getPaymentGateway, StripeAdapter, PayPalAdapter, PaymentGateway,
} = require('../patterns/PaymentAdapter');
const logger = require('../patterns/Logger');

describe('Strategy pattern — cancellation policy', () => {
  const soon = { date: new Date(Date.now() + 2 * 60 * 60 * 1000) };  // 2h away
  const later = { date: new Date(Date.now() + 48 * 60 * 60 * 1000) }; // 48h away

  it('selects the right strategy by role', () => {
    expect(strategyForRole('admin')).to.be.instanceOf(AdminCancellationStrategy);
    expect(strategyForRole('user')).to.be.instanceOf(MemberCancellationStrategy);
  });

  it('blocks a member cancelling inside the 24h window', () => {
    const d = strategyForRole('user').isCancellationAllowed(soon);
    expect(d.allowed).to.equal(false);
    expect(d.reason).to.match(/24 hours/);
  });

  it('allows a member cancelling well before the event', () => {
    expect(strategyForRole('user').isCancellationAllowed(later).allowed).to.equal(true);
  });

  it('allows an admin to cancel anytime', () => {
    expect(strategyForRole('admin').isCancellationAllowed(soon).allowed).to.equal(true);
  });
});

describe('Adapter pattern — payment gateways', () => {
  it('returns adapters that conform to the common PaymentGateway interface', () => {
    expect(getPaymentGateway('stripe')).to.be.instanceOf(PaymentGateway);
    expect(getPaymentGateway('paypal')).to.be.instanceOf(PaymentGateway);
    expect(getPaymentGateway('stripe')).to.be.instanceOf(StripeAdapter);
    expect(getPaymentGateway('paypal')).to.be.instanceOf(PayPalAdapter);
  });

  it('exposes a uniform charge() result shape across providers', () => {
    for (const provider of ['stripe', 'paypal']) {
      const res = getPaymentGateway(provider).charge({ amount: 100, currency: 'AUD' });
      expect(res).to.have.all.keys('success', 'provider', 'transactionId');
      expect(res.success).to.equal(true);
      expect(res.provider).to.equal(provider);
    }
  });

  it('defaults to Stripe for an unknown provider', () => {
    expect(getPaymentGateway('unknown')).to.be.instanceOf(StripeAdapter);
  });
});

describe('Singleton pattern — Logger', () => {
  it('returns the same shared instance on re-require', () => {
    const again = require('../patterns/Logger');
    expect(again).to.equal(logger);
  });

  it('accumulates log entries on the shared buffer', () => {
    const before = logger.entries.length;
    logger.info('test entry');
    expect(logger.entries.length).to.equal(before + 1);
  });
});
