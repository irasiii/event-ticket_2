/**
 * Prototype pattern.
 *
 * Admins frequently create a new event that is almost identical to an existing
 * one (a recurring concert, a weekly workshop, a tour stop). Rather than
 * rebuilding the whole configuration field by field, we clone an existing
 * event used as a PROTOTYPE and tweak only what differs (date, title).
 *
 * The clone is a deep copy with booking-specific state reset (sold counts back
 * to 0, status back to draft) so the new event starts fresh.
 */

/**
 * Wraps an event-like object (Mongoose doc or plain object) and can spawn
 * independent copies of it.
 */
class EventPrototype {
  /** @param {object} source - the event to use as a template. */
  constructor(source) {
    // Normalise a Mongoose document to a plain object first.
    this.template =
      source && typeof source.toObject === 'function' ? source.toObject() : { ...source };
  }

  /**
   * Produce a deep, independent copy of the template with sales state reset
   * and any per-instance overrides applied.
   *
   * @param {object} overrides - fields to replace on the clone (e.g. { title, date }).
   * @returns {object} a plain event object ready to be persisted as a new event.
   */
  clone(overrides = {}) {
    // Deep copy so nested ticketTiers are not shared with the prototype.
    const copy = JSON.parse(JSON.stringify(this.template));

    // Strip identity / persistence fields so this becomes a brand-new record.
    delete copy._id;
    delete copy.id;
    delete copy.createdAt;
    delete copy.updatedAt;
    delete copy.__v;

    // Reset booking-specific state.
    copy.status = 'draft';
    if (Array.isArray(copy.ticketTiers)) {
      copy.ticketTiers = copy.ticketTiers.map((tier) => {
        const { _id, id, ...rest } = tier;
        return { ...rest, sold: 0 };
      });
    }

    return { ...copy, ...overrides };
  }
}

module.exports = { EventPrototype };
