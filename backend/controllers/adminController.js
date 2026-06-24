const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const { RealAnalyticsService, AnalyticsProxy } = require('../patterns/AnalyticsProxy'); // Proxy

// The heavy data work lives in a function injected into the real service; the
// proxy below guards it so only admins can ever reach it.
async function computeAnalytics() {
  const [totalUsers, totalEvents, totalBookings, revenueResult, recentBookings] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Event.countDocuments(),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Booking.find({ status: 'confirmed' })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name email')
        .populate('event', 'title date'),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    // Booking trend — last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trend = await Booking.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, status: 'confirmed' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return { totalUsers, totalEvents, totalBookings, totalRevenue, recentBookings, trend };
}

// GET /api/admin/analytics  — access guarded by the Proxy pattern.
const analyticsProxy = new AnalyticsProxy(new RealAnalyticsService(computeAnalytics));

const getAnalytics = async (req, res) => {
  try {
    const data = await analyticsProxy.getAnalytics(req.user);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ users, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/users/:id
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const bookings = await Booking.find({ user: user._id })
      .populate('event', 'title date')
      .sort({ createdAt: -1 });
    res.json({ user, bookings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/admin/users/:id
const updateUser = async (req, res) => {
  try {
    const { isActive, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (isActive !== undefined) user.isActive = isActive;
    if (role && ['user', 'admin'].includes(role)) user.role = role;
    await user.save();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/users/:id  (soft delete — deactivate)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = false;
    await user.save();
    res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/bookings
const getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, eventId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (eventId) query.event = eventId;
    const total = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .populate('user', 'name email')
      .populate('event', 'title date venue')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ bookings, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/events  — all statuses
const getAllEvents = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) query.title = { $regex: search, $options: 'i' };
    const total = await Event.countDocuments(query);
    const events = await Event.find(query)
      .populate('category', 'name')
      .populate('venue', 'name city')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ events, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAnalytics, getAllUsers, getUserById, updateUser, deleteUser, getAllBookings, getAllEvents };
// (Proxy pattern guards getAnalytics — see patterns/AnalyticsProxy.js)
