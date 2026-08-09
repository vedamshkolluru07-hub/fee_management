// middlewares/roleMiddleware.js

/**
 * ROLE & PERMISSION MIDDLEWARE
 * -----------------------------------------
 * Must run AFTER requireSession + attachUser, since it reads req.user
 * (not req.session.user). This is the single place role/permission
 * checks live — sessionMiddleware.js no longer has its own requireRole.
 */

const forbidden = (res, message, username = 'unknown') => {
  console.warn(`🚫 [RoleMiddleware] Access denied for user: ${username}`);

  return res.status(403).json({
    success: false,
    message,
  });
};

const unauthorized = (res) => {
  console.warn('🟡 [RoleMiddleware] Unauthorized request (no req.user)');

  return res.status(401).json({
    success: false,
    message: 'Not authenticated',
  });
};

// ======================================================
// requireRole(['admin', 'staff', ...])
// ======================================================
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return unauthorized(res);
      }

      const { role, username } = user;

      if (!role || !allowedRoles.includes(role)) {
        return forbidden(res, 'Access denied: insufficient role', username);
      }

      return next();
    } catch (err) {
      console.error('❌ [RoleMiddleware] Error in requireRole:', err);

      return res.status(500).json({
        success: false,
        message: 'Authorization error',
      });
    }
  };
};

// ======================================================
// requireUserManagement — permission flag check
// ======================================================
const requireUserManagement = (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return unauthorized(res);
    }

    const { username, can_manage_users } = user;

    if (!can_manage_users) {
      return forbidden(res, 'Access denied: cannot manage users', username);
    }

    return next();
  } catch (err) {
    console.error('❌ [RoleMiddleware] Error in requireUserManagement:', err);

    return res.status(500).json({
      success: false,
      message: 'Authorization error',
    });
  }
};

module.exports = {
  requireRole,
  requireUserManagement,
};