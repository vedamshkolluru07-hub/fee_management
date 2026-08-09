const userRepo = require('../repositories/userRepository.js');
const { hashPassword } = require('../../../utils/bycryptUtil.js');
const {
  notifyUserAction
} = require('../services/notificationsCreateService.js');
const {
  createAuditLogService
} = require('../services/auditLogServiceCreate.js');

/**
 * -----------------------------------
 * AUTHORIZATION HELPERS
 * -----------------------------------
 */

// Admins, and anyone explicitly flagged can_manage_users, can see/manage
// every account. Everyone else can only see/manage themselves.
function isPrivileged(actor) {
  return !!actor && (actor.role === 'admin' || actor.can_manage_users === true);
}

function isSelf(actor, userId) {
  return !!actor && actor.user_id === userId;
}

// Fields a non-privileged user is allowed to change on their own account.
// Anything security/permission related (role, can_manage_users,
// is_approved, deleted) is deliberately excluded so a normal user can
// never escalate their own privileges through this endpoint.
const SELF_EDITABLE_FIELDS = new Set([
  'username',
  'first_name',
  'last_name',
  'email',
  'phone',
  'password_hash'
]);

// Never let password_hash leave this module.
function sanitizeUser(user) {
  if (!user) return user;
  const { password_hash, ...safe } = user;
  return safe;
}

function sanitizeResult(result) {
  if (!result) return result;
  if (Array.isArray(result.data)) {
    return { ...result, data: result.data.map(sanitizeUser) };
  }
  if (result.data) {
    return { ...result, data: sanitizeUser(result.data) };
  }
  return result;
}

const FORBIDDEN = { success: false, message: 'Access denied', status: 403 };

/**
 * -----------------------------------
 * HELPERS
 * -----------------------------------
 */
async function ensurePasswordHashed(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }
  return hashPassword(password);
}

function sanitizeCreatePayload(data = {}) {
  return {
    username: data.username?.trim(),
    first_name: data.first_name?.trim(),
    last_name: data.last_name?.trim(),
    email: data.email?.trim()?.toLowerCase() || null,
    phone: data.phone?.trim(),
    password: data.password,
    role: data.role
  };
}

/**
 * -----------------------------------
 * CREATE USER
 * -----------------------------------
 */
async function createUser(data, actor = null) {
  try {
    const payload = sanitizeCreatePayload(data);
    const hashedPassword = await ensurePasswordHashed(
      payload.password
    );

    const result = await userRepo.createUser({
      username: payload.username,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      password_hash: hashedPassword
    });

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CREATE_USER',
      category: 'create',
      log_message: `User '${payload.username}' was created`,
      target_user_id: result?.data?.user_id || null,
      target_entity_type: 'user',
      changes: { username: payload.username, role: payload.role, email: payload.email, phone: payload.phone },
      success: result?.success !== false
    });

    return sanitizeResult(result);
  } catch (err) {
    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CREATE_USER',
      category: 'create',
      log_message: `Failed to create user: ${err.message}`,
      target_entity_type: 'user',
      success: false,
      severity: 'warning'
    });

    return {
      success: false,
      message: err.message || 'Service error while creating user'
    };
  }
}

/**
 * -----------------------------------
 * CREATE ADMIN
 * (route already restricted to role==='admin', actor is always privileged)
 * -----------------------------------
 */
async function createAdmin(data, actor = null) {
  try {
    const payload = sanitizeCreatePayload(data);
    const hashedPassword = await ensurePasswordHashed(
      payload.password
    );

    const result = await userRepo.createAdmin({
      username: payload.username,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      password_hash: hashedPassword
    });

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CREATE_ADMIN',
      category: 'create',
      log_message: `Admin '${payload.username}' was created`,
      target_user_id: result?.data?.user_id || null,
      target_entity_type: 'user',
      changes: { username: payload.username, role: payload.role, email: payload.email, phone: payload.phone },
      success: result?.success !== false,
      severity: 'warning'
    });

    return sanitizeResult(result);
  } catch (err) {
    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CREATE_ADMIN',
      category: 'create',
      log_message: `Failed to create admin: ${err.message}`,
      target_entity_type: 'user',
      success: false,
      severity: 'warning'
    });

    return {
      success: false,
      message: err.message || 'Service error while creating admin'
    };
  }
}

/**
 * -----------------------------------
 * READ USERS
 * Every read is scoped by `actor`: privileged actors (admin /
 * can_manage_users) can look up anyone; everyone else only ever gets
 * their own record back, regardless of what they asked for.
 * -----------------------------------
 */
async function getUser(identifier, actor) {
  if (!isPrivileged(actor)) {
    // Ignore the requested identifier entirely — a plain user can only
    // ever fetch their own profile, never probe for other accounts.
    return sanitizeResult(await userRepo.getUserById(actor?.user_id));
  }
  return sanitizeResult(await userRepo.getUser(identifier));
}

async function getUserById(userId, actor) {
  if (!isPrivileged(actor) && !isSelf(actor, userId)) {
    return FORBIDDEN;
  }
  return sanitizeResult(await userRepo.getUserById(userId));
}

async function getUserIdByName(name, actor) {
  if (!isPrivileged(actor)) {
    return FORBIDDEN;
  }
  return userRepo.getUserIdByName(name);
}

async function getUserDetailsByName(name, actor) {
  if (!isPrivileged(actor)) {
    return FORBIDDEN;
  }
  return sanitizeResult(await userRepo.getUserDetailsByName(name));
}

async function getAllUsers(filters = {}, actor) {
  if (!isPrivileged(actor)) {
    // Non-privileged users never get a list — only their own record,
    // shaped the same way getAllUsers normally responds.
    const self = await userRepo.getUserById(actor?.user_id);
    return sanitizeResult({
      success: self.success,
      data: self.success ? [self.data] : []
    });
  }
  return sanitizeResult(await userRepo.getAllUsers(filters));
}

/**
 * -----------------------------------
 * STATS (route-gated to privileged actors only)
 * -----------------------------------
 */
async function getTotalUsersByRole(role) {
  return userRepo.getTotalUsersByRole(role);
}

async function getAdminStats() {
  return userRepo.getAdminStats();
}

/**
 * -----------------------------------
 * UPDATE PASSWORD + NOTIFICATION
 * Self may change their own password; otherwise actor must be privileged.
 * -----------------------------------
 */
async function updatePassword(userId, newPassword, actor) {
  if (!isPrivileged(actor) && !isSelf(actor, userId)) {
    return FORBIDDEN;
  }

  try {
    const hashedPassword = await ensurePasswordHashed(newPassword);
    const result = await userRepo.updatePassword(
      userId,
      hashedPassword
    );

    if (result?.success !== false) {
      await notifyUserAction({
        actor,
        targetUsers: userId,
        action: 'update_password'
      });
    }

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'UPDATE_PASSWORD',
      category: 'update',
      log_message: `Password updated for user ${userId}`,
      target_user_id: userId,
      target_entity_type: 'user',
      success: result?.success !== false,
      severity: 'warning'
    });

    return result;
  } catch (err) {
    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'UPDATE_PASSWORD',
      category: 'update',
      log_message: `Failed to update password for user ${userId}: ${err.message}`,
      target_user_id: userId,
      target_entity_type: 'user',
      success: false,
      severity: 'warning'
    });

    return {
      success: false,
      message: err.message || 'Service error while updating password'
    };
  }
}

/**
 * -----------------------------------
 * TOGGLES / ROLE + NOTIFICATIONS
 * (routes already restrict these to admin / can_manage_users actors)
 * -----------------------------------
 */
async function toggleIsApproved(userId, value, actor) {
  const result = await userRepo.toggleIsApproved(
    userId,
    Boolean(value)
  );

  if (result?.success !== false) {
    await notifyUserAction({
      actor,
      targetUsers: userId,
      action: 'toggle_is_approved'
    });
  }

  await createAuditLogService({
    actor_user_id: actor?.user_id || null,
    action: 'TOGGLE_IS_APPROVED',
    category: 'update',
    log_message: `User ${userId} approval set to ${Boolean(value)}`,
    target_user_id: userId,
    target_entity_type: 'user',
    changes: { is_approved: Boolean(value) },
    success: result?.success !== false
  });

  return result;
}

async function toggleCanManageUsers(userId, value, actor) {
  const result = await userRepo.toggleCanManageUsers(
    userId,
    Boolean(value)
  );

  if (result?.success !== false) {
    await notifyUserAction({
      actor,
      targetUsers: userId,
      action: 'toggle_deleted'
    });
  }

  await createAuditLogService({
    actor_user_id: actor?.user_id || null,
    action: 'TOGGLE_CAN_MANAGE_USERS',
    category: 'update',
    log_message: `User ${userId} can_manage_users set to ${Boolean(value)}`,
    target_user_id: userId,
    target_entity_type: 'user',
    changes: { can_manage_users: Boolean(value) },
    success: result?.success !== false,
    severity: 'warning'
  });

  return result;
}

async function toggleDeleted(userId, value, actor) {
  const result = await userRepo.toggleDeleted(
    userId,
    Boolean(value)
  );

  if (result?.success !== false) {
    await notifyUserAction({
      actor,
      targetUsers: userId,
      action: 'toggle_deleted'
    });
  }

  await createAuditLogService({
    actor_user_id: actor?.user_id || null,
    action: 'TOGGLE_DELETED',
    category: 'update',
    log_message: `User ${userId} deleted flag set to ${Boolean(value)}`,
    target_user_id: userId,
    target_entity_type: 'user',
    changes: { deleted: Boolean(value) },
    success: result?.success !== false,
    severity: 'warning'
  });

  return result;
}

async function changeUserRole(userId, role, actor) {
  const result = await userRepo.changeUserRole(userId, role);

  if (result?.success !== false) {
    await notifyUserAction({
      actor,
      targetUsers: userId,
      action: 'role_change',
      metadata: { role }
    });
  }

  await createAuditLogService({
    actor_user_id: actor?.user_id || null,
    action: 'CHANGE_USER_ROLE',
    category: 'update',
    log_message: `User ${userId} role changed to '${role}'`,
    target_user_id: userId,
    target_entity_type: 'user',
    changes: { role },
    success: result?.success !== false,
    severity: 'warning'
  });

  return result;
}

/**
 * -----------------------------------
 * UPDATE USER DATA + NOTIFICATIONS
 *
 * SECURITY FIX: this endpoint used to accept ANY field in ALLOWED_FIELDS
 * (including role / can_manage_users / is_approved / deleted) from ANY
 * logged-in user for ANY target userId — a straight privilege-escalation
 * hole. Now:
 *   - non-privileged actors may only target themselves (a single id
 *     matching their own user_id), and only touch SELF_EDITABLE_FIELDS
 *   - privileged actors (admin / can_manage_users) keep full access
 * -----------------------------------
 */
async function updateUserData(userIds, data = {}, actor) {
  try {
    const ids = Array.isArray(userIds) ? userIds : [userIds];

    if (!isPrivileged(actor)) {
      const onlyTargetsSelf =
        ids.length === 1 && isSelf(actor, ids[0]);

      if (!onlyTargetsSelf) {
        return FORBIDDEN;
      }

      const requestedFields = Object.keys(data);
      const hasDisallowedField = requestedFields.some(
        (field) => field !== 'password' && !SELF_EDITABLE_FIELDS.has(field)
      );

      if (hasDisallowedField) {
        return {
          success: false,
          message: 'You are not allowed to modify one or more of those fields'
        };
      }
    }

    const payload = { ...data };

    if (payload.password) {
      payload.password_hash =
        await ensurePasswordHashed(payload.password);
      delete payload.password;
    }
    if (payload.email) payload.email = payload.email.trim().toLowerCase();
    if (payload.username) payload.username = payload.username.trim();
    if (payload.first_name) payload.first_name = payload.first_name.trim();
    if (payload.last_name) payload.last_name = payload.last_name.trim();
    if (payload.phone) payload.phone = payload.phone.trim();

    const result = await userRepo.updateUserData(ids, payload);

    if (result?.success !== false) {
      await notifyUserAction({
        actor,
        targetUsers: ids,
        action: 'update_user_data'
      });
    }

    // don't log the raw password hash into audit changes
    const { password_hash, ...safeChanges } = payload;

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'UPDATE_USER_DATA',
      category: 'update',
      log_message: `User data updated for: ${ids.join(', ')}`,
      target_user_id: ids.length === 1 ? ids[0] : null,
      target_entity_type: 'user',
      changes: { userIds: ids, data: safeChanges },
      success: result?.success !== false
    });

    return result;
  } catch (err) {
    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'UPDATE_USER_DATA',
      category: 'update',
      log_message: `Failed to update user data: ${err.message}`,
      target_entity_type: 'user',
      success: false,
      severity: 'warning'
    });

    return {
      success: false,
      message: err.message || 'Service error while updating users'
    };
  }
}

/**
 * -----------------------------------
 * DELETE OPERATIONS + NOTIFICATIONS
 * (routes already restrict these to admin / can_manage_users actors)
 * -----------------------------------
 */
async function deleteUsers(userIds, actor) {
  const result = await userRepo.deleteUsers(userIds);

  if (result?.success !== false) {
    await notifyUserAction({
      actor,
      targetUsers: userIds,
      action: 'delete_user'
    });
  }

  await createAuditLogService({
    actor_user_id: actor?.user_id || null,
    action: 'DELETE_USERS',
    category: 'delete',
    log_message: `User(s) hard-deleted: ${Array.isArray(userIds) ? userIds.join(', ') : userIds}`,
    target_user_id: Array.isArray(userIds) ? null : userIds,
    target_entity_type: 'user',
    changes: { userIds },
    success: result?.success !== false,
    severity: 'critical'
  });

  return result;
}

async function softDeleteUsers(userIds, actor) {
  const result = await userRepo.softDeleteUsers(userIds);

  if (result?.success !== false) {
    await notifyUserAction({
      actor,
      targetUsers: userIds,
      action: 'soft_delete_user'
    });
  }

  await createAuditLogService({
    actor_user_id: actor?.user_id || null,
    action: 'SOFT_DELETE_USERS',
    category: 'delete',
    log_message: `User(s) soft-deleted: ${Array.isArray(userIds) ? userIds.join(', ') : userIds}`,
    target_user_id: Array.isArray(userIds) ? null : userIds,
    target_entity_type: 'user',
    changes: { userIds },
    success: result?.success !== false,
    severity: 'warning'
  });

  return result;
}

async function deleteUnapprovedUsers(actor) {
  const result = await userRepo.deleteUnapprovedUsers();

  if (result?.success !== false && result?.affectedUsers?.length) {
    await notifyUserAction({
      actor,
      targetUsers: result.affectedUsers,
      action: 'delete_user'
    });
  }

  await createAuditLogService({
    actor_user_id: actor?.user_id || null,
    action: 'DELETE_UNAPPROVED_USERS',
    category: 'delete',
    log_message: `Bulk deleted unapproved users${result?.affectedUsers?.length ? `: ${result.affectedUsers.join(', ')}` : ''}`,
    target_entity_type: 'user',
    changes: { affectedUsers: result?.affectedUsers || [] },
    success: result?.success !== false,
    severity: 'warning'
  });

  return result;
}

async function deleteSoftDeletedUsers(actor) {
  const result = await userRepo.deleteSoftDeletedUsers();

  if (result?.success !== false && result?.affectedUsers?.length) {
    await notifyUserAction({
      actor,
      targetUsers: result.affectedUsers,
      action: 'soft_delete_user'
    });
  }

  await createAuditLogService({
    actor_user_id: actor?.user_id || null,
    action: 'PURGE_SOFT_DELETED_USERS',
    category: 'delete',
    log_message: `Purged soft-deleted users${result?.affectedUsers?.length ? `: ${result.affectedUsers.join(', ')}` : ''}`,
    target_entity_type: 'user',
    changes: { affectedUsers: result?.affectedUsers || [] },
    success: result?.success !== false,
    severity: 'critical'
  });

  return result;
}

/**
 * -----------------------------------
 * EXPORTS
 * -----------------------------------
 */
module.exports = {
  createAdmin,
  createUser,
  getUser,
  getUserById,
  getUserIdByName,
  getUserDetailsByName,
  getAllUsers,
  getTotalUsersByRole,
  getAdminStats,
  updatePassword,
  toggleIsApproved,
  toggleCanManageUsers,
  toggleDeleted,
  changeUserRole,
  updateUserData,
  deleteUsers,
  softDeleteUsers,
  deleteUnapprovedUsers,
  deleteSoftDeletedUsers
};