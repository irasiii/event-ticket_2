/**
 * Domain layer — OOP demonstration.
 *
 * User is the base class for all account types. It demonstrates:
 *  - Encapsulation: sensitive fields are held in truly-private (#) fields and
 *    exposed only through controlled accessors.
 *  - Abstraction: callers interact with a clean behavioural interface
 *    (getPermissions, canManageEvents, describe) and never touch internals.
 *  - Polymorphism: subclasses (Admin, Member, Guest) override these methods.
 */
class User {
  // Encapsulated (private) fields — not reachable from outside the instance.
  #id;
  #email;
  #role;

  constructor({ id = null, name = 'Guest', email = '', role = 'guest' } = {}) {
    this.name = name;
    this.#id = id;
    this.#email = email;
    this.#role = role;
  }

  // --- Controlled accessors (encapsulation) ---
  get id() { return this.#id; }
  get role() { return this.#role; }

  /** Masked email — internal value is never exposed directly. */
  get maskedEmail() {
    if (!this.#email) return '';
    const [local, domain] = this.#email.split('@');
    return `${local.slice(0, 2)}***@${domain || ''}`;
  }

  // --- Behaviour meant to be overridden by subclasses (polymorphism) ---
  getPermissions() { return ['view_public_events']; }

  canManageEvents() { return false; }

  canCancelAnytime() { return false; }

  /**
   * Method overloading (simulated, the JS way): one method name, behaviour
   * varies by the number / type of arguments passed.
   *   greet()            -> generic greeting
   *   greet(name)        -> personalised greeting
   *   greet(name, formal)-> formal/informal variant
   */
  greet(...args) {
    if (args.length === 0) return `Hello, ${this.name}.`;
    if (args.length === 1) return `Hello ${args[0]}, I am ${this.name}.`;
    const [other, formal] = args;
    return formal
      ? `Good day ${other}. I am ${this.name} (${this.#role}).`
      : `Hey ${other}! It's ${this.name}.`;
  }

  describe() {
    return `${this.name} <${this.maskedEmail}> — role=${this.#role}, perms=[${this.getPermissions().join(', ')}]`;
  }
}

module.exports = User;
