// routes/postponementRoutes.js

const express = require('express');
const router = express.Router();
const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');
const postponementController = require('../controllers/postponementController.js');

// ======================================================
// POSTPONE EVENT
// ======================================================
router.patch(
  '/events/:event_id/postpone',
  requireSession, attachUser,
  postponementController.postponeEvent
);

// ======================================================
// GET POSTPONEMENT HISTORY
// ======================================================
router.get(
  '/events/:event_id/postponement-history',
  postponementController.getPostponementHistory
);

// ======================================================
// CLEANUP OLD RESCHEDULE RECORDS
// ======================================================
router.delete(
  '/postponement/cleanup',
  postponementController.cleanupOldReschedules
);

module.exports = router;