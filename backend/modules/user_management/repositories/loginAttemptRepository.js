const db = require('../../../utils/db.js');

const TABLE = 'loginattempts'; // ✅ FIXED: consistent lowercase table name

/**
 * ======================================================
 * 🔹 CREATE LOGIN ATTEMPT
 * ======================================================
 */
async function createLoginAttempt({
  user_id,
  ip_address,
  user_agent,
  device_info,
  success = false,
}) {
  try {
    const result = await db.query(
      `
      INSERT INTO ${TABLE}
        (user_id, ip_address, user_agent, device_info, success)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING *;
      `,
      [
        user_id,
        ip_address,
        user_agent,
        device_info ? JSON.stringify(device_info) : null,
        success,
      ]
    );

    return {
      success: true,
      attempt: result.rows[0],
      message: success
        ? 'Login attempt recorded (success)'
        : 'Login attempt recorded (failed)',
    };

  } catch (err) {
    console.error('❌ createLoginAttempt error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 CHECK LOGIN ATTEMPT LIMIT
 * ======================================================
 */
async function hasExceededLoginAttempts(user_id, limit = 3) {
  try {
    const result = await db.query(
      `
      SELECT COUNT(*)::int AS count
      FROM ${TABLE}
      WHERE user_id = $1
        AND success = FALSE
        AND attempted_at >= NOW() - INTERVAL '15 minutes';
      `,
      [user_id]
    );

    const count = result.rows[0]?.count ?? 0;

    return {
      success: true,
      exceeded: count >= limit,
      attempts: count,
    };

  } catch (err) {
    console.error('❌ hasExceededLoginAttempts error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 UPDATE LOGIN ATTEMPT
 * ======================================================
 */
async function updateLoginAttempt(attempt_id, updates = {}) {
  const keys = Object.keys(updates);

  if (keys.length === 0) {
    return { success: false, message: 'No fields to update' };
  }

  try {
    const setClause = keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');

    const values = [...Object.values(updates), attempt_id];

    const result = await db.query(
      `
      UPDATE ${TABLE}
      SET ${setClause}
      WHERE attempt_id = $${keys.length + 1}
      RETURNING *;
      `,
      values
    );

    return {
      success: true,
      data: result.rows[0] || null,
    };

  } catch (err) {
    console.error('❌ updateLoginAttempt error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 CLEANUP OLD LOGIN ATTEMPTS
 * ======================================================
 */
async function deleteOldLoginAttempts() {
  try {
    const result = await db.query(
      `
      DELETE FROM ${TABLE}
      WHERE attempted_at < NOW() - INTERVAL '2 days'
      RETURNING attempt_id;
      `
    );

    return {
      success: true,
      deleted: result.rows.length,
    };

  } catch (err) {
    console.error('❌ deleteOldLoginAttempts error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 GET USER LOGIN ATTEMPTS (PAGINATED)
 * ======================================================
 */
async function getUserLoginAttempts(user_id, limit = 50, offset = 0) {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM ${TABLE}
      WHERE user_id = $1
      ORDER BY attempted_at DESC
      LIMIT $2 OFFSET $3;
      `,
      [user_id, limit, offset]
    );

    return {
      success: true,
      data: result.rows,
    };

  } catch (err) {
    console.error('❌ getUserLoginAttempts error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  createLoginAttempt,
  hasExceededLoginAttempts,
  updateLoginAttempt,
  deleteOldLoginAttempts,
  getUserLoginAttempts,
};