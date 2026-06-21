/**
 * Decorator pattern.
 *
 * The price a customer pays starts as the raw ticket subtotal, but optional
 * charges/discounts can be layered on at runtime: a booking service fee,
 * ticket-protection insurance, a promo-code discount, etc. Each layer is a
 * decorator that wraps another price component and exposes the SAME interface
 *   price() -> number   and   describe() -> string
 * so any combination can be stacked in any order without changing the others.
 *
 *   Component : PriceComponent (interface)
 *   Concrete  : BasePrice (the wrapped subtotal)
 *   Decorators: ServiceFeeDecorator, TicketProtectionDecorator, PromoDecorator
 */

/** Common interface for the base price and every decorator. */
class PriceComponent {
  price() {
    throw new Error('price() must be implemented');
  }

  describe() {
    throw new Error('describe() must be implemented');
  }
}

/** The undecorated subtotal (sum of ticket line items). */
class BasePrice extends PriceComponent {
  constructor(amount) {
    super();
    this.amount = Number(amount) || 0;
  }

  price() {
    return this.amount;
  }

  describe() {
    return `Subtotal: $${this.amount.toFixed(2)}`;
  }
}

/** Base class for decorators — wraps an inner PriceComponent. */
class PriceDecorator extends PriceComponent {
  constructor(inner) {
    super();
    this.inner = inner;
  }

  price() {
    return this.inner.price();
  }

  describe() {
    return this.inner.describe();
  }
}

/** Adds a percentage booking/service fee on top of the running total. */
class ServiceFeeDecorator extends PriceDecorator {
  constructor(inner, ratePct = 5) {
    super(inner);
    this.ratePct = ratePct;
  }

  price() {
    return this.inner.price() * (1 + this.ratePct / 100);
  }

  describe() {
    const fee = this.inner.price() * (this.ratePct / 100);
    return `${this.inner.describe()} | +Service fee (${this.ratePct}%): $${fee.toFixed(2)}`;
  }
}

/** Adds a flat ticket-protection (insurance) charge. */
class TicketProtectionDecorator extends PriceDecorator {
  constructor(inner, fee = 4.95) {
    super(inner);
    this.fee = fee;
  }

  price() {
    return this.inner.price() + this.fee;
  }

  describe() {
    return `${this.inner.describe()} | +Ticket protection: $${this.fee.toFixed(2)}`;
  }
}

/** Applies a percentage promo discount. */
class PromoDecorator extends PriceDecorator {
  constructor(inner, discountPct = 10, code = 'PROMO') {
    super(inner);
    this.discountPct = discountPct;
    this.code = code;
  }

  price() {
    return this.inner.price() * (1 - this.discountPct / 100);
  }

  describe() {
    const discount = this.inner.price() * (this.discountPct / 100);
    return `${this.inner.describe()} | -Promo ${this.code} (${this.discountPct}%): $${discount.toFixed(2)}`;
  }
}

/**
 * Helper: build a decorated price from a subtotal and a set of options.
 * Returns both the final (rounded) amount and a human-readable breakdown.
 *
 * @param {number} subtotal
 * @param {{ serviceFeePct?:number, protection?:boolean, promo?:{pct:number,code:string} }} opts
 */
function buildPrice(subtotal, opts = {}) {
  let component = new BasePrice(subtotal);
  if (opts.serviceFeePct) component = new ServiceFeeDecorator(component, opts.serviceFeePct);
  if (opts.protection) component = new TicketProtectionDecorator(component);
  if (opts.promo) component = new PromoDecorator(component, opts.promo.pct, opts.promo.code);

  return {
    total: Math.round(component.price() * 100) / 100,
    breakdown: component.describe(),
  };
}

module.exports = {
  PriceComponent,
  BasePrice,
  PriceDecorator,
  ServiceFeeDecorator,
  TicketProtectionDecorator,
  PromoDecorator,
  buildPrice,
};
