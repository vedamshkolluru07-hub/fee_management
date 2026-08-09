const userRepo = require('../repositories/userRepository.js');
const sessionRepo = require('../repositories/deviceSessionRepository.js');

/**
 * ======================================================
 * 🔐 AUTHORIZATION HELPERS
 * Same rule as userService: admins / can_manage_users can view anyone's
 * sessions. Everyone else can only view their own.
 * ======================================================
 */
function isPrivileged(actor) {
  return !!actor && (actor.role === 'admin' || actor.can_manage_users === true);
}

function isSelf(actor, userId) {
  return !!actor && String(actor.user_id) === String(userId);
}

const FORBIDDEN = { success: false, message: 'Access denied', status: 403 };

/**
 * ======================================================
 * 🔹 GET SESSIONS (BY USER_ID OR NAME)
 * - No user_id/name given -> defaults to the actor's own sessions.
 * - user_id/name given and it resolves to someone else -> only allowed
 *   if the actor is privileged (admin / can_manage_users).
 * ======================================================
 */
async function getSessionsService({ user_id, name, limit = 50, offset = 0 }, actor) {
  try {
    let resolvedUserId = user_id;

    /**
     * CASE 2: name provided (resolve ambiguity) — only privileged actors
     * are allowed to look sessions up by name, since it implies browsing
     * other users.
     */
    if (!resolvedUserId && name) {
      if (!isPrivileged(actor)) {
        return FORBIDDEN;
      }

      const users = await userRepo.getUserIdByName(name);

      if (!users || users.length === 0) {
        return { success: false, message: 'No user found' };
      }

      if (users.length > 1) {
        return {
          success: false,
          message: 'Multiple users found. Please select a user.',
          candidates: users,
        };
      }

      resolvedUserId = users[0].user_id;
    }

    // CASE 1 (default): no user_id/name resolved yet -> fall back to the
    // actor viewing their own sessions.
    if (!resolvedUserId) {
      if (!actor?.user_id) {
        return { success: false, message: 'user_id or name is required' };
      }
      resolvedUserId = actor.user_id;
    }

    // Authorization: self is always allowed; viewing someone else's
    // sessions requires privilege.
    if (!isSelf(actor, resolvedUserId) && !isPrivileged(actor)) {
      return FORBIDDEN;
    }

    const sessionsRes = await sessionRepo.getAllSessionsByUser(
      resolvedUserId,
      limit,
      offset
    );

    if (!sessionsRes.success) {
      return { success: false, message: sessionsRes.message || 'Failed to fetch sessions' };
    }

    return {
      success: true,
      user_id: resolvedUserId,
      data: sessionsRes.data || [],
    };
  } catch (err) {
    console.error('❌ getSessionsService error:', err.message);
    return { success: false, message: 'Service error' };
  }
}

/**
 * ======================================================
 * 🔹 DELETE SESSION (BY USER_ID OR NAME + DATE)
 * ======================================================
 */
async function deleteSessionService({ user_id, name, date }, actor) {
  try {
    let resolvedUserId = user_id;

    if (!date) {
      return { success: false, message: 'date is required' };
    }

    if (!resolvedUserId && name) {
      if (!isPrivileged(actor)) {
        return FORBIDDEN;
      }

      const users = await userRepo.getUserIdByName(name);

      if (!users || users.length === 0) {
        return { success: false, message: 'No user found' };
      }

      if (users.length > 1) {
        return {
          success: false,
          message: 'Multiple users found. Please select a user.',
          candidates: users,
        };
      }

      resolvedUserId = users[0].user_id;
    }

    if (!resolvedUserId) {
      if (!actor?.user_id) {
        return { success: false, message: 'user_id or name is required' };
      }
      resolvedUserId = actor.user_id;
    }

    if (!isSelf(actor, resolvedUserId) && !isPrivileged(actor)) {
      return FORBIDDEN;
    }

    const result = await sessionRepo.deleteSession(resolvedUserId, date);

    if (!result.success) {
      return { success: false, message: result.message || 'Failed to delete session' };
    }

    return {
      success: true,
      user_id: resolvedUserId,
      data: result.data || null,
    };
  } catch (err) {
    console.error('❌ deleteSessionService error:', err.message);
    return { success: false, message: 'Service error' };
  }
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  getSessionsService,
  deleteSessionService,
};