/**
 * Adapter pattern.
 *
 * Different payment providers (Stripe, PayPal) expose different SDK shapes.
 * Each adapter wraps a provider behind ONE common interface —
 * charge({ amount, currency, reference }) -> { success, provider, transactionId }
 * — so the rest of the system depends on the interface, not on any vendor.
 *
 * These are sandbox/simulated gateways (no real network calls), matching the
 * assignment's "sandbox payment gateways" example.
 */

/** Target interface every adapter conforms to. */
class PaymentGateway {
  // eslint-disable-next-line no-unused-vars
  charge(_payment) {
    throw new Error('charge() must be implemented by a concrete adapter');
  }
}

/** Simulated third-party SDK with its own method name/shape. */
class StripeSDK {
  createCharge(amountCents, currency) {
    return { id: 'ch_' + Math.random().toString(36).slice(2, 12), paid: true, amountCents, currency };
  }
}

class PayPalSDK {
  makePayment(total, curr) {
    return { paymentId: 'PAY-' + Math.random().toString(36).slice(2, 12).toUpperCase(), state: 'approved', total, curr };
  }
}

class StripeAdapter extends PaymentGateway {
  constructor(sdk = new StripeSDK()) { super(); this.sdk = sdk; }

  charge({ amount, currency = 'AUD' }) {
    const res = this.sdk.createCharge(Math.round(amount * 100), currency);
    return { success: !!res.paid, provider: 'stripe', transactionId: res.id };
  }
}

class PayPalAdapter extends PaymentGateway {
  constructor(sdk = new PayPalSDK()) { super(); this.sdk = sdk; }

  charge({ amount, currency = 'AUD' }) {
    const res = this.sdk.makePayment(amount, currency);
    return { success: res.state === 'approved', provider: 'paypal', transactionId: res.paymentId };
  }
}

/** Factory helper to obtain an adapter by provider name. */
function getPaymentGateway(provider = 'stripe') {
  switch ((provider || '').toLowerCase()) {
    case 'paypal': return new PayPalAdapter();
    case 'stripe':
    default:       return new StripeAdapter();
  }
}

module.exports = {
  PaymentGateway, StripeAdapter, PayPalAdapter,
  StripeSDK, PayPalSDK, getPaymentGateway,
};
