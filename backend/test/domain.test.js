const { expect } = require('chai');
const User = require('../domain/User');
const Admin = require('../domain/Admin');
const Member = require('../domain/Member');
const Guest = require('../domain/Guest');
const UserFactory = require('../domain/UserFactory');

describe('OOP domain layer', () => {
  describe('Encapsulation', () => {
    it('hides the raw email and exposes only a masked accessor', () => {
      const u = new Member({ name: 'John', email: 'john@example.com' });
      expect(u.maskedEmail).to.equal('jo***@example.com');
      expect(u.email).to.be.undefined;        // private #email is not accessible
    });
  });

  describe('Inheritance', () => {
    it('Admin and Member both inherit from User', () => {
      expect(new Admin()).to.be.instanceOf(User);
      expect(new Member()).to.be.instanceOf(User);
      expect(new Guest()).to.be.instanceOf(User);
    });

    it('Admin reuses base permissions via super and extends them', () => {
      const perms = new Admin({ name: 'A' }).getPermissions();
      expect(perms).to.include('view_public_events');   // from base
      expect(perms).to.include('manage_users');         // added by Admin
    });
  });

  describe('Polymorphism (overriding)', () => {
    it('getPermissions() differs by subclass', () => {
      expect(new Admin().getPermissions()).to.include('view_analytics');
      expect(new Member().getPermissions()).to.include('book_tickets');
      expect(new Member().getPermissions()).to.not.include('view_analytics');
      expect(new Guest().getPermissions()).to.deep.equal(['view_public_events']);
    });

    it('canManageEvents()/canCancelAnytime() are role-specific', () => {
      expect(new Admin().canManageEvents()).to.equal(true);
      expect(new Member().canManageEvents()).to.equal(false);
      expect(new Admin().canCancelAnytime()).to.equal(true);
      expect(new Member().canCancelAnytime()).to.equal(false);
    });
  });

  describe('Polymorphism (overloading by arity)', () => {
    it('greet() behaves differently by argument count', () => {
      const u = new Member({ name: 'Sara' });
      expect(u.greet()).to.equal('Hello, Sara.');
      expect(u.greet('Tom')).to.equal('Hello Tom, I am Sara.');
      expect(u.greet('Tom', true)).to.contain('Good day Tom');
    });
  });

  describe('Factory', () => {
    it('returns the correct subclass for a role', () => {
      expect(UserFactory.create({ role: 'admin' })).to.be.instanceOf(Admin);
      expect(UserFactory.create({ role: 'user' })).to.be.instanceOf(Member);
      expect(UserFactory.create({})).to.be.instanceOf(Guest);
    });
  });
});
