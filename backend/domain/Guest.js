const User = require('./User');

/**
 * Guest is an unauthenticated visitor. It inherits the base behaviour
 * unchanged, which is exactly the minimal public permission set.
 */
class Guest extends User {
  constructor(props = {}) {
    super({ ...props, role: 'guest', name: props.name || 'Guest' });
  }
}

module.exports = Guest;
