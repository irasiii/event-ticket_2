const Event = require('../models/Event');
const { EventPrototype } = require('../patterns/EventPrototype');   // Prototype

// GET /api/events  — public, paginated
const getEvents = async (req, res) => {
  try {
    const { page = 1, limit = 9, category, search, status = 'published' } = req.query;
    const query = { status };
    if (category) query.category = category;
    if (search) query.title = { $regex: search, $options: 'i' };

    const total = await Event.countDocuments(query);
    const events = await Event.find(query)
      .populate('category', 'name icon')
      .populate('venue', 'name address city')
      .populate('createdBy', 'name')
      .sort({ date: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ events, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/events/:id  — public
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('category', 'name icon')
      .populate('venue', 'name address city capacity facilities')
      .populate('createdBy', 'name');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/events  — admin
const createEvent = async (req, res) => {
  try {
    const event = await Event.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ event });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/events/:id  — admin
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('category', 'name icon').populate('venue', 'name address city');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ event });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE /api/events/:id  — admin
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    // Soft-cancel rather than hard delete so bookings retain reference
    event.status = 'cancelled';
    await event.save();
    res.json({ message: 'Event cancelled successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/events/:id/clone  — admin (Prototype pattern)
// Clone an existing event as a template; sold counts reset and status -> draft.
const cloneEvent = async (req, res) => {
  try {
    const source = await Event.findById(req.params.id);
    if (!source) return res.status(404).json({ message: 'Event not found' });

    // Prototype — deep-copy the template, apply only the overrides supplied.
    const overrides = { ...req.body, createdBy: req.user._id };
    const cloned = new EventPrototype(source).clone(overrides);

    const event = await Event.create(cloned);
    res.status(201).json({ event });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { getEvents, getEventById, createEvent, updateEvent, deleteEvent, cloneEvent };
