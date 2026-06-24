const Admin = require('./Admin');
const Member = require('./Member');
const Guest = require('./Guest');

/**
 * Factory pattern.
 *
 * Centralises the decision of WHICH concrete User subclass to instantiate,
 * based on the role/credentials. Callers ask the factory for a domain user
 * and receive a ready, correctly-typed object without knowing the concrete
 * class — new roles can be added here without touching call sites.
 */
class UserFactory {
  /**
   * @param {object} data - typically a Mongoose user document (or plain object).
   * @returns {User} an Admin, Member or Guest instance.
   */
  static create(data = {}) {
    const role = (data.role || 'guest').toLowerCase();
    const props = {
      id: data._id || data.id || null,
      name: data.name || 'Guest',
      email: data.email || '',
    };

    switch (role) {
      case 'admin':
        return new Admin(props);
      case 'user':
      case 'member':
        return new Member(props);
      default:
        return new Guest(props);
    }
  }
}

module.exports = UserFactory;
