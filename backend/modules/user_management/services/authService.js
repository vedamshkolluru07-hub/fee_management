const { hashPassword, comparePassword } = require('../../../utils/bycryptUtil.js');
const db = require('../../../utils/db.js');
const userRepo = require('../repositories/userRepository.js');
const sessionRepo = require('../repositories/deviceSessionRepository.js');
const loginAttemptRepo = require('../repositories/loginAttemptRepository.js');
const auditLogRepo = require('../repositories/auditLogRepository.js');
const appSettingsRepo = require('../repositories/appSettingsRepository.js');
const notificationsRepo = require('../repositories/notificationRepository.js');

/**
 * ======================================================
 * 🔐 LOGIN (WITH DEBUG LOGGING)
 * ======================================================
 */
async function login({
  identifier,
  password,
  ip_address,
  user_agent,
  device_info,
}) {
  console.log("\n🔵 [LOGIN DEBUG] Incoming request");
  console.log({
    identifier,
    ip_address,
    user_agent,
    device_info,
  });

  try {
    console.log("\n🔍 [LOGIN DEBUG] Fetching user from repository...");
    const userRes = await userRepo.getUser(identifier);

    console.log("🧾 [LOGIN DEBUG] userRepo.getUser response:");
    console.log(userRes);

    if (!userRes?.success || !userRes?.data) {
      console.warn("⚠️ [LOGIN DEBUG] User not found or invalid response");
      return { success: false, message: "Invalid credentials" };
    }

    const user = userRes.data;

    console.log("👤 [LOGIN DEBUG] User loaded:");
    console.log({
      user_id: user.user_id,
      role: user.role,
      deleted: user.deleted,
      is_approved: user.is_approved,
    });

    if (user.deleted) {
      console.warn("⛔ [LOGIN DEBUG] User is deleted/suspended");
      return { success: false, message: "Account is banned or suspended" };
    }

    if (!user.is_approved) {
      console.warn("⛔ [LOGIN DEBUG] User not approved");
      return { success: false, message: "Permission denied" };
    }

    console.log("📊 [LOGIN DEBUG] Checking login attempts...");
    const attemptCheck =
      await loginAttemptRepo.hasExceededLoginAttempts(user.user_id);

    console.log("🧮 [LOGIN DEBUG] attemptCheck result:");
    console.log(attemptCheck);

    if (attemptCheck?.success && attemptCheck?.exceeded) {
      console.warn("🚫 [LOGIN DEBUG] Too many failed login attempts");
      return {
        success: false,
        message: "Too many failed attempts. Try later",
      };
    }

    console.log("🔐 [LOGIN DEBUG] Comparing password...");
    const isMatch = await comparePassword(password, user.password_hash);

    console.log("🔑 [LOGIN DEBUG] Password match result:", isMatch);

    if (!isMatch) {
      console.warn("❌ [LOGIN DEBUG] Invalid password");

      await loginAttemptRepo.createLoginAttempt({
        user_id: user.user_id,
        ip_address,
        user_agent,
        device_info,
        success: false,
      });

      console.log("📝 [LOGIN DEBUG] Failed login attempt recorded");

      return { success: false, message: "Invalid credentials" };
    }

    console.log("✅ [LOGIN DEBUG] Password verified successfully");

    console.log("🧾 [LOGIN DEBUG] Recording successful login attempt...");
    await loginAttemptRepo.createLoginAttempt({
      user_id: user.user_id,
      ip_address,
      user_agent,
      device_info,
      success: true,
    });

    // ------------------------------------------------------
    // CHANGE: the LOGIN audit log entry has been removed.
    // The login itself is now recorded via the DeviceSessions
    // "create" action below:
    //   1. createSession()      -> upserts today's session row
    //   2. addActivityPeriod()  -> opens a new activity period
    //                              with a start timestamp, which
    //                              logout's closeLastActivityPeriod()
    //                              later closes with an end timestamp.
    // This gives the same "user logged in, here's when" record
    // that the audit log used to provide, but tied to the actual
    // session/activity data instead of a separate audit entry.
    // ------------------------------------------------------
    console.log("🧠 [LOGIN DEBUG] Creating device session...");
    const session = await sessionRepo.createSession(user.user_id);

    console.log("📦 [LOGIN DEBUG] Session created:");
    console.log(session);

    console.log("🟢 [LOGIN DEBUG] Opening new activity period...");
    const activityPeriod = await sessionRepo.addActivityPeriod(user.user_id, {
      start: new Date().toISOString(),
      ip_address,
      user_agent,
      device_info,
    });

    console.log("📦 [LOGIN DEBUG] Activity period opened:");
    console.log(activityPeriod);

    console.log("🎉 [LOGIN DEBUG] Login successful for user:", user.user_id);

    return {
      success: true,
      message: "Login successful",
      data: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        can_manage_users: user.can_manage_users,
        is_approved: user.is_approved,
        session: activityPeriod?.data || session?.data || null,
      },
    };
  } catch (err) {
    console.error("\n❌ [LOGIN DEBUG] UNEXPECTED ERROR:");
    console.error(err);

    return {
      success: false,
      message: "Internal server error",
    };
  }
}

/**
 * ======================================================
 * 🔓 LOGOUT
 * ======================================================
 */
async function logout({
  user_id,
  session_date,
  endTime = new Date().toISOString(),
}) {
  try {
    const userRes = await userRepo.getUserById(user_id);

    if (!userRes?.success || !userRes?.data) {
      return { success: false, message: "User not found" };
    }

    // ------------------------------------------------------
    // Record the logout by closing the user's current
    // activity period in DeviceSessions.
    // This replaces the previous LOGOUT audit log.
    // ------------------------------------------------------
    await sessionRepo.closeLastActivityPeriod(user_id, endTime);

    // Remove the active device session.
    if (session_date) {
      await sessionRepo.deleteSession(user_id, session_date);
    }

    return {
      success: true,
      message: "Logout successful",
    };
  } catch (err) {
    console.error("❌ LOGOUT SERVICE ERROR:", err);

    return {
      success: false,
      message: "Internal server error",
    };
  }
}

/**
 * ======================================================
 * 🔒 TRANSACTION HELPER
 * ------------------------------------------------------
 * ASSUMPTION: utils/db.js exports a `pool` (a `pg` Pool
 * instance) in addition to `query`. This is required to
 * run several statements against the SAME connection so
 * that `SELECT ... FOR UPDATE`, the COUNT check, and the
 * INSERT are all part of one atomic transaction.
 *
 * If your db.js does NOT export `pool`, expose one (or an
 * equivalent `getClient()` function) and swap the line
 * below accordingly — a transaction cannot be done safely
 * through a plain `db.query()` that hands out a different
 * pooled connection per call.
 * ======================================================
 */
async function withTransaction(callback) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * ------------------------------------------------------
 * Locks the AppSettings row for a given key so concurrent
 * create-user / create-admin requests can't both read the
 * same "count so far" and both slip in under the limit.
 * Falls back to a no-op lock (returns null) if the row
 * doesn't exist yet, so callers still get the default from
 * appSettingsRepo elsewhere in the codebase.
 * ------------------------------------------------------
 */
async function lockSettingRow(client, key) {
  const result = await client.query(
    `
    SELECT setting_value
    FROM AppSettings
    WHERE setting_key = $1
    FOR UPDATE
    `,
    [key]
  );

  return result.rows[0] || null;
}

/**
 * ======================================================
 * 🔹 CREATE USER
 * ======================================================
 */
async function createUserService(data) {
  try {
    const restrict = await appSettingsRepo.findByKey('restrict_user_creation');

    if (restrict?.data?.value === '1') {
      return {
        success: false,
        message: 'User creation is restricted by admin settings',
      };
    }

    const hashedPassword = await hashPassword(data.password);

    const payload = {
      ...data,
      password_hash: hashedPassword,
      role: 'user',
      is_approved: false,
    };

    let txResult;

    try {
      txResult = await withTransaction(async (client) => {
        // Lock the user_limit row (or the whole table's relevant
        // rows) for the duration of this transaction so a second
        // concurrent signup can't read the same pre-insert count.
        await lockSettingRow(client, 'user_limit');

        const limitRes = await appSettingsRepo.findByKey('user_limit');
        const userLimit = await appSettingsRepo.getUserLimit();  // ✅ safe fallback (100)

        const countResult = await client.query(
          `
          SELECT COUNT(*)::INT AS total
          FROM Users
          WHERE role = 'user'
            AND deleted = FALSE
          `
        );
        const currentUsers = countResult.rows[0]?.total || 0;

        if (currentUsers >= userLimit) {
          return {
            success: false,
            message: 'User limit reached',
            meta: {
              userLimit,
              currentUsers,
              remaining: 0,
            },
          };
        }

        const uniqueCheck = await userRepo.checkUniqueFields
          ? null // checkUniqueFields is not exported; createUser handles it internally
          : null;

        // NOTE: userRepo.createUser() runs its own uniqueness check
        // and INSERT via the shared `db.query()` pool, not via this
        // transaction's `client`. That's fine for correctness of the
        // limit check itself (the row lock above already prevents
        // two transactions from both passing the count check), but
        // it does mean the INSERT is not part of this transaction.
        // If you need the insert to roll back together with the
        // limit check (e.g. on a later failure), have userRepo
        // expose a variant that accepts `client` instead of using
        // the pool directly.
        const createResult = await userRepo.createUser(payload);

        return {
          ...createResult,
          meta: {
            userLimit,
            currentUsers,
            remaining: userLimit - currentUsers - 1,
          },
        };
      });
    } catch (txErr) {
      console.error("❌ CREATE USER TRANSACTION ERROR:", txErr);
      return {
        success: false,
        message: 'Unexpected error during user creation',
      };
    }

    if (!txResult.success) return txResult;

    const adminRes = await userRepo.getAllUsers({
      role: 'admin',
      deleted: false,
    });

    const admins = adminRes?.success ? adminRes.data : [];

    if (admins.length) {
      await notificationsRepo.createBulkNotifications(
        admins.map((admin) => ({
          user_id: admin.user_id,
          title: 'New User Awaiting Approval',
          message: `A new user (${payload.username}) is waiting for approval.`,
          type: 'info',
        }))
      );
    }

    return {
      success: true,
      message: 'User created successfully and pending approval',
      meta: txResult.meta,
    };
  } catch (err) {
    console.error("❌ CREATE USER ERROR:", err);
    return {
      success: false,
      message: 'Unexpected error during user creation',
    };
  }
}

/**
 * ======================================================
 * 🔹 CREATE ADMIN
 * ======================================================
 */
async function createAdminService(data) {
  try {
    const restrict = await appSettingsRepo.findByKey('restrict_admin_creation');

    if (restrict?.data?.value === '1') {
      return {
        success: false,
        message: 'Admin creation is restricted by system settings',
      };
    }

    const hashedPassword = await hashPassword(data.password);

    const payload = {
      ...data,
      password_hash: hashedPassword,
      role: 'admin',
      is_approved: true,
      can_manage_users: true,
    };

    let txResult;

    try {
      txResult = await withTransaction(async (client) => {
        await lockSettingRow(client, 'admin_limit');

        const limitRes = await appSettingsRepo.findByKey('admin_limit');
        const adminLimit = await appSettingsRepo.getAdminLimit(); // ✅ needs adding to the repo, see below

        const countResult = await client.query(
          `
          SELECT COUNT(*)::INT AS total
          FROM Users
          WHERE role = 'admin'
            AND deleted = FALSE
          `
        );
        const currentAdmins = countResult.rows[0]?.total || 0;

        if (currentAdmins >= adminLimit) {
          return {
            success: false,
            message: 'Admin limit reached',
            meta: {
              adminLimit,
              currentAdmins,
              remaining: 0,
            },
          };
        }

        // Same caveat as createUserService: this INSERT goes through
        // userRepo's own pooled `db.query()`, not this transaction's
        // `client`. The row lock above is what actually prevents the
        // race; see note above if you want the insert itself inside
        // the transaction too.
        const createResult = await userRepo.createAdmin(payload);

        return {
          ...createResult,
          meta: {
            adminLimit,
            currentAdmins,
            remaining: adminLimit - currentAdmins - 1,
          },
        };
      });
    } catch (txErr) {
      console.error("❌ CREATE ADMIN TRANSACTION ERROR:", txErr);
      return {
        success: false,
        message: 'Unexpected error during admin creation',
      };
    }

    if (!txResult.success) return txResult;

    return {
      success: true,
      message: 'Admin created successfully',
      meta: txResult.meta,
    };
  } catch (err) {
    console.error("❌ CREATE ADMIN ERROR:", err);
    return {
      success: false,
      message: 'Unexpected error during admin creation',
    };
  }
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  login,
  logout,
  createUserService,
  createAdminService,
};