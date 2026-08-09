// middlewares/sessionMiddleware.js

/**
 * AUTH SESSION CHECK MIDDLEWARE
 * -----------------------------------------
 * Ensures user is logged in via server-side session (express-session + pg store).
 * Does NOT set req.user and does NOT check roles — that is attachUser.js
 * and roleMiddleware.js's job. This file has one responsibility only.
 */

function requireSession(req, res, next) {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No active session',
      });
    }

    return next();
  } catch (err) {
    console.error('❌ [SessionMiddleware] Error:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Session validation error',
    });
  }
}

module.exports = {
  requireSession,
};