const QRCode = require('qrcode');
const Booking = require('../models/Booking');
const Event = require('../models/Event');

// --- Pattern / service layer (OOP + design patterns) ---
const { strategyForRole } = require('../patterns/cancellationStrategy');     // Strategy
const logger = require('../patterns/Logger');                               // Singleton
const { BookingFacade } = require('../patterns/BookingFacade');             // Facade (wraps Adapter + Decorator + Observer + service)

// One shared facade orchestrates validation, pricing add-ons, payment,
// seat deduction and notifications behind a single interface.
const bookingFacade = new BookingFacade();

// POST /api/bookings  — authenticated user
const createBooking = async (req, res) => {
  try {
    const { eventId, tickets, paymentProvider = 'stripe', addOns = {} } = req.body; // tickets: [{tierName, quantity}]
    if (!eventId || !tickets || !tickets.length) {
      return res.status(400).json({ message: 'eventId and tickets are required' });
    }

    const event = await Event.findById(eventId);

    // Facade pattern — one call orchestrates validation + pricing (Decorator),
    // payment (Adapter) and seat deduction (service layer).
    const result = bookingFacade.placeBooking({ event, tickets, paymentProvider, addOns });
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }
    const { totalAmount, bookedTickets, payment } = result;

    // Persist the event with the deducted seats.
    await event.save();

    // Factory — generate QR.
    const qrData = `BOOKING-${req.user._id}-${eventId}-${Date.now()}`;
    const qrCode = await QRCode.toDataURL(qrData);

    const booking = await Booking.create({
      user: req.user._id,
      event: eventId,
      tickets: bookedTickets,
      totalAmount,
      qrCode,
      qrData,
      paymentRef: payment.transactionId,
    });

    logger.info('Booking created', { booking: booking._id.toString(), provider: payment.provider });

    // Observer pattern — notify all subscribers (email stub, audit log, …).
    bookingFacade.announceCreated({
      id: booking._id.toString(),
      userEmail: req.user.email,
      total: totalAmount,
    });

    await booking.populate('event', 'title date venue');
    res.status(201).json({ booking });
  } catch (err) {
    logger.error('Booking creation failed', { error: err.message });
    res.status(500).json({ message: err.message });
  }
};

// GET /api/bookings/my  — authenticated user
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('event', 'title date venue status bannerImage')
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/bookings/:id  — authenticated user (own booking)
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('event', 'title date venue status bannerImage')
      .populate('user', 'name email');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json({ booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/bookings/:id  — authenticated user (cancel own)
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('event');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    // Strategy pattern — choose the cancellation policy by role at runtime.
    const policy = strategyForRole(req.user.role);
    const decision = policy.isCancellationAllowed(booking.event);
    if (!decision.allowed) {
      return res.status(400).json({ message: decision.reason });
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    await booking.save();

    // Facade restores seats (service layer) and announces via Observer.
    const event = await Event.findById(booking.event._id);
    bookingFacade.cancelBooking({
      event,
      bookedTickets: booking.tickets,
      booking: { id: booking._id.toString(), userEmail: req.user.email },
    });
    if (event) await event.save();

    logger.info('Booking cancelled', { booking: booking._id.toString(), by: req.user.role });
    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (err) {
    logger.error('Booking cancellation failed', { error: err.message });
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createBooking, getMyBookings, getBookingById, cancelBooking };
