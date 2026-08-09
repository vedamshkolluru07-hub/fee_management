// repositories/deviceSessionRepository.js

const db = require('../../../utils/db.js');

/**
 * ----------------------------
 * 🔹 CREATE SESSION (UPSERT)
 * ----------------------------
 */
async function createSession(userId) {
  try {
    const result = await db.query(
      `
      INSERT INTO DeviceSessions (user_id, session_date, activity_periods)
      VALUES ($1, CURRENT_DATE, '[]'::jsonb)
      ON CONFLICT (user_id, session_date)
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING *;
      `,
      [userId]
    );

    return { success: true, data: result.rows[0] };
  } catch (err) {
    console.error('❌ createSession error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ----------------------------
 * 🔹 GET SESSION BY USER + DATE
 * ----------------------------
 */
async function getSessionByUserAndDate(userId, date) {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM DeviceSessions
      WHERE user_id = $1 AND session_date = $2;
      `,
      [userId, date]
    );

    return { success: true, data: result.rows[0] || null };
  } catch (err) {
    console.error('❌ getSession error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ----------------------------
 * 🔹 ADD ACTIVITY PERIOD (SAFE JSONB APPEND)
 * ----------------------------
 */
async function addActivityPeriod(userId, activity) {
  try {
    const result = await db.query(
      `
      UPDATE DeviceSessions
      SET activity_periods = COALESCE(activity_periods, '[]'::jsonb) || $1::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
        AND session_date = CURRENT_DATE
      RETURNING *;
      `,
      [JSON.stringify([activity]), userId]
    );

    return { success: true, data: result.rows[0] || null };
  } catch (err) {
    console.error('❌ addActivityPeriod error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ----------------------------
 * 🔹 CLOSE LAST ACTIVITY PERIOD (FIXED SAFE UPDATE)
 * ----------------------------
 */
async function closeLastActivityPeriod(userId, endTime) {
  try {
    const result = await db.query(
      `
      UPDATE DeviceSessions
      SET activity_periods = (
        SELECT COALESCE(
          jsonb_agg(
            CASE
              WHEN idx = last_idx THEN
                elem || jsonb_build_object('end', $1)
              ELSE elem
            END
            ORDER BY idx
          ),
          '[]'::jsonb
        )
        FROM jsonb_array_elements(activity_periods) WITH ORDINALITY AS t(elem, idx),
             (SELECT jsonb_array_length(activity_periods) - 1 AS last_idx) sub
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
        AND session_date = CURRENT_DATE
      RETURNING *;
      `,
      [endTime, userId]
    );

    return { success: true, data: result.rows[0] || null };
  } catch (err) {
    console.error('❌ closeLastActivityPeriod error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ----------------------------
 * 🔹 GET ALL SESSIONS (PAGINATED)
 * ----------------------------
 */
async function getAllSessionsByUser(userId, limit = 50, offset = 0) {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM DeviceSessions
      WHERE user_id = $1
      ORDER BY session_date DESC
      LIMIT $2 OFFSET $3;
      `,
      [userId, limit, offset]
    );

    return { success: true, data: result.rows };
  } catch (err) {
    console.error('❌ getAllSessions error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ----------------------------
 * 🔹 DELETE SESSION
 * ----------------------------
 */
async function deleteSession(userId, date) {
  try {
    const result = await db.query(
      `
      DELETE FROM DeviceSessions
      WHERE user_id = $1 AND session_date = $2
      RETURNING *;
      `,
      [userId, date]
    );

    return { success: true, data: result.rows[0] || null };
  } catch (err) {
    console.error('❌ deleteSession error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ----------------------------
 * 🔹 EXPORTS
 * ----------------------------
 */
module.exports = {
  createSession,
  getSessionByUserAndDate,
  addActivityPeriod,
  closeLastActivityPeriod,
  getAllSessionsByUser,
  deleteSession,
};