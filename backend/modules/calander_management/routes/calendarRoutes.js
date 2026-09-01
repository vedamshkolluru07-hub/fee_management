// routes/calendarRoutes.js

const express = require('express');
const router = express.Router();
const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');
const calendarController = require('../controllers/calendarController.js');

// ======================================================
// CREATE EVENT
// ======================================================
router.post('/events', requireSession, attachUser , calendarController.createEvent);

// ======================================================
// GET EVENTS (FILTERED)
// ======================================================
router.get('/events', calendarController.getEvents);

// ======================================================
// GET UPCOMING 15 DAYS EVENTS
// ======================================================
router.get('/events/upcoming-15-days', calendarController.getUpcoming15DayEvents);

// ======================================================
// GET LOGIN ALERT EVENTS (NEXT 24 HOURS)
// ======================================================
router.get('/events/login-alerts', calendarController.getLoginAlertEvents);

// ======================================================
// GET RECENT COMPLETED EVENT
// ======================================================
router.get('/events/recent-completed', calendarController.getRecentCompletedEvent);

// ======================================================
// GET EVENT BY ID
// ======================================================
router.get('/events/:event_id', calendarController.getEventById);

// ======================================================
// UPDATE EVENT
// ======================================================
router.patch('/events/:event_id', requireSession, attachUser, calendarController.updateEvent);

// ======================================================
// DELETE EVENT
// ======================================================
router.delete('/events/:event_id', requireSession, attachUser, calendarController.deleteEvent);

// ======================================================
// BULK DELETE EVENTS
// ======================================================
router.delete('/events', requireSession, attachUser, calendarController.deleteBulk);

module.exports = router;