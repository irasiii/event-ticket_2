const User = require('./User');

/**
 * Admin inherits from User (inheritance / code reuse) and overrides several
 * methods to provide elevated behaviour (polymorphism via method overriding).
 */
class Admin extends User {
  constructor(props = {}) {
    super({ ...props, role: 'admin' });
  }

  // Override — admins have the full permission set.
  getPermissions() {
    return [
      ...super.getPermissions(),       // reuse base permissions
      'manage_events',
      'manage_venues',
      'manage_categories',
      'manage_users',
      'view_analytics',
    ];
  }

  // Override — admins may manage events and cancel bookings without time limits.
  canManageEvents() { return true; }
  canCancelAnytime() { return true; }
}

module.exports = Admin;
