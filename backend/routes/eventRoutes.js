const express = require('express');
const { getEvents, getEventById, createEvent, updateEvent, deleteEvent, cloneEvent } = require('../controllers/eventController');
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');

const router = express.Router();

router.get('/',     getEvents);
router.get('/:id',  getEventById);
router.post('/',    protect, admin, createEvent);
router.post('/:id/clone', protect, admin, cloneEvent);
router.put('/:id',  protect, admin, updateEvent);
router.delete('/:id', protect, admin, deleteEvent);

module.exports = router;
