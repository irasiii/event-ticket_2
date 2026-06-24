const User = require('./User');

/**
 * Member (a registered customer) inherits from User and overrides the
 * permission set. It keeps the base cancellation rule (must respect the
 * 24-hour window), demonstrating selective override.
 */
class Member extends User {
  constructor(props = {}) {
    super({ ...props, role: 'user' });
  }

  // Override — members can book and manage their own bookings.
  getPermissions() {
    return [
      ...super.getPermissions(),
      'book_tickets',
      'view_own_bookings',
      'cancel_own_booking',
      'manage_own_profile',
    ];
  }

  // Inherits canManageEvents() === false and canCancelAnytime() === false.
}

module.exports = Member;
