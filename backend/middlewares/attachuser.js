// middlewares/attachuser.js

const userRepository = require('../modules/user_management/repositories/userRepository.js');

/**
 * ATTACH USER MIDDLEWARE
 * -----------------------------------------
 * Runs AFTER requireSession.
 * Loads the fresh user row from the DB (session only holds user_id + role)
 * and puts it on req.user, so downstream middleware/controllers can rely
 * on req.user.username, req.user.is_approved, req.user.deleted, etc.
 *
 * Also blocks deleted / unapproved accounts here, in one place,
 * instead of duplicating that check in every route.
 *
 * SECURITY FIX: password_hash is stripped from req.user before it is
 * attached. Nothing downstream needs it (login/password comparison is
 * handled separately in authService using its own repo call), and
 * keeping it off req.user means it can never accidentally leak into a
 * JSON response if a controller ever does `res.json(req.user)`.
 */
module.exports = async function attachUser(req, res, next) {
  try {
    const sessionUser = req.session?.user;

    if (!sessionUser?.user_id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const result = await userRepository.getUserById(sessionUser.user_id);

    if (!result.success || !result.data) {
      // Session points to a user that no longer exists
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        message: 'Session is no longer valid',
      });
    }

    const { password_hash, ...safeUser } = result.data;

    if (safeUser.deleted === true) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deleted',
      });
    }

    if (safeUser.is_approved === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is not approved',
      });
    }

    req.user = safeUser;

    return next();
  } catch (err) {
    console.error('❌ [AttachUser] Error:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to resolve authenticated user',
    });
  }
};