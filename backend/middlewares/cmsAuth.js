// ======================================================
// middleware/cmsAuth.js
//
// IMPORTANT: This assumes your existing session/auth middleware already
// runs earlier in the chain and attaches the logged-in user to `req.user`
// as { user_id, username, role, can_manage_users, is_approved }
// — matching the CurrentUser shape your Angular AuthService already uses
// (GET /auth/me). If your existing middleware attaches the user somewhere
// else (e.g. req.session.user), just change `req.user` below to match.
// ======================================================

/** Blocks the request unless a logged-in user is attached to req.user */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  next();
}

/** Blocks the request unless the user's role is in the allowed list */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
