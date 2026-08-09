// routes/authRoutes.js

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authcontroller.js');
const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const loginAlertMiddleware = require('../../../middlewares/loginAlertMiddleware.js');
const attachUser = require('../../../middlewares/attachUser.js');
const { requireUserManagement } = require('../../../middlewares/roleMiddleware.js');

/**
 * ======================================================
 * 🔐 AUTH ROUTES
 * ======================================================
 */

router.get('/me', requireSession, attachUser, async (req, res) => {
  const {
    user_id,
    username,
    role,
    can_manage_users,
    is_approved
  } = req.user;

  res.status(200).json({
    success: true,
    data: {
      user_id,
      username,
      role,
      can_manage_users,
      is_approved,
    },
  });
});


// Login (this is what creates req.session.user)
router.post('/login', authController.login);

// Logout
router.post('/logout', authController.logout);

// ------------------------------------------------------
// CHANGE: /users and /admins previously had NO middleware
// at all, meaning anyone (logged in or not) could hit these
// endpoints directly and create a user — or worse, create a
// full admin account with can_manage_users: true.
//
// /users  -> public self-registration form stays open (no
//            auth required), matches createUserService's own
//            "pending approval" flow — new accounts are
//            created with is_approved: false already, so
//            this one is intentionally left public.
//
// /admins -> this MUST require an authenticated user who
//            already has can_manage_users permission, since
//            it creates a fully approved admin account with
//            can_manage_users: true. Mirrors the frontend's
//            canManageUsersGuard.
// ------------------------------------------------------

// Create User (public self-registration; created unapproved)
router.post('/users', authController.createUser);

// Create Admin (admin-only — must be logged in + able to manage users)
router.post(
  '/admins',
  requireSession,
  attachUser,
  requireUserManagement,
  authController.createAdmin
);

// ======================================================
// 🔔 LOGIN ALERTS — called by frontend right after a
// successful /login, once req.session.user exists.
// ======================================================
router.get(
  '/login-alerts',
  requireSession,
  loginAlertMiddleware,
  (req, res) => {
    res.status(200).json({
      success: true,
      data: req.loginAlerts,
    });
  }
);

module.exports = router;