// routes/deviceSessionRoutes.js

const express = require('express');
const router = express.Router();

const {
  getSessionsController,
  deleteSessionController,
} = require('../controllers/deviceSessionController.js');

const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');

/**
 * ======================================================
 * 🔹 GET SESSIONS
 * GET /api/sessions
 * Query: user_id | name | limit | offset
 * SECURITY FIX: this route had no auth middleware at all — anyone could
 * fetch any user's device sessions. Now requires a resolved session user;
 * self-vs-other scoping is enforced inside deviceSessionService.
 * ======================================================
 */
router.get('/sessions', requireSession, attachUser, getSessionsController);

/**
 * ======================================================
 * 🔹 DELETE SESSION
 * DELETE /api/sessions
 * Body: user_id | name | date
 * SECURITY FIX: same as above — was fully unauthenticated.
 * ======================================================
 */
router.delete('/sessions', requireSession, attachUser, deleteSessionController);

module.exports = router;