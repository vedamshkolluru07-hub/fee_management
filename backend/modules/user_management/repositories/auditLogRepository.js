// repositories/auditLogRepository.js

const db = require('../../../utils/db.js');

/**
 * ======================================================
 * 🔹 RESPONSE HELPERS
 * ======================================================
 */
function success(data) {
  return { success: true, data };
}

function error(message) {
  return { success: false, message };
}

/**
 * ======================================================
 * 🔹 FILTER BUILDER (CLEAN QUERY FLOW)
 * ======================================================
 */
function buildAuditFilters(params) {
  const filters = [];
  const values = [];
  let i = 1;

  const add = (condition, value) => {
    filters.push(condition);
    values.push(value);
  };

  if (params.category) add(`category = $${i++}`, params.category);

  if (params.target_entity_type)
    add(`target_entity_type = $${i++}`, params.target_entity_type);

  if (params.action)
    add(`action ILIKE $${i++}`, `%${params.action}%`);

  if (typeof params.success !== 'undefined')
    add(`success = $${i++}`, params.success);

  if (params.target_user_id)
    add(`target_user_id = $${i++}`, params.target_user_id);

  if (params.actor_user_id)
    add(`actor_user_id = $${i++}`, params.actor_user_id);

  if (params.role_at_time)
    add(`role_at_time = $${i++}`, params.role_at_time);

  return { filters, values, index: i };
}

/**
 * ======================================================
 * 🔹 CREATE AUDIT LOG
 * ======================================================
 */
async function createAuditLog({
  actor_user_id,
  action,
  role_at_time,
  category,
  log_message,
  target_user_id,
  target_entity_type,
  changes,
  success: isSuccess = true,
  severity = 'info',
}) {
  try {
    const result = await db.query(
      `
      INSERT INTO AuditLogs (
        actor_user_id,
        action,
        role_at_time,
        category,
        log_message,
        target_user_id,
        target_entity_type,
        changes,
        success,
        severity
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *;
      `,
      [
        actor_user_id,
        action,
        role_at_time,
        category,
        log_message,
        target_user_id,
        target_entity_type,
        changes,
        isSuccess,
        severity,
      ]
    );

    return success(result.rows[0]);
  } catch (err) {
    console.error('❌ createAuditLog error:', err.message);
    return error('Database error');
  }
}

/**
 * ======================================================
 * 🔹 GET AUDIT LOGS (FILTERED + PAGINATED)
 * ======================================================
 */
async function getAuditLogs(params = {}) {
  try {
    const { filters, values, index } = buildAuditFilters(params);

    const whereClause = filters.length
      ? `WHERE ${filters.join(' AND ')}`
      : '';

    const limit = params.limit || 100;
    const offset = params.offset || 0;

    const query = `
      SELECT *
      FROM AuditLogs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${index} OFFSET $${index + 1};
    `;

    values.push(limit, offset);

    const result = await db.query(query, values);

    return success(result.rows);
  } catch (err) {
    console.error('❌ getAuditLogs error:', err.message);
    return error('Database error');
  }
}

/**
 * ======================================================
 * 🔹 UPDATE AUDIT LOG (SAFE DYNAMIC UPDATE)
 * ======================================================
 */
async function updateAuditLog(log_id, updates = {}) {
  const restricted = new Set([
    'log_id',
    'actor_user_id',
    'target_user_id',
  ]);

  const keys = Object.keys(updates).filter(
    (k) => !restricted.has(k)
  );

  if (!keys.length) {
    return error('No valid fields to update');
  }

  try {
    const setClause = keys
      .map((k, i) => `${k} = $${i + 1}`)
      .join(', ');

    const values = [...keys.map((k) => updates[k]), log_id];

    const result = await db.query(
      `
      UPDATE AuditLogs
      SET ${setClause}
      WHERE log_id = $${keys.length + 1}
      RETURNING *;
      `,
      values
    );

    return success(result.rows[0] || null);
  } catch (err) {
    console.error('❌ updateAuditLog error:', err.message);
    return error('Database error');
  }
}

/**
 * ======================================================
 * 🔹 DELETE AUDIT LOGS (BULK)
 * ======================================================
 */
async function deleteAuditLogs(logIds = []) {
  if (!Array.isArray(logIds) || !logIds.length) {
    return error('No log IDs provided');
  }

  try {
    const placeholders = logIds
      .map((_, i) => `$${i + 1}`)
      .join(',');

    const result = await db.query(
      `
      DELETE FROM AuditLogs
      WHERE log_id IN (${placeholders})
      RETURNING log_id;
      `,
      logIds
    );

    return success(result.rows.map((r) => r.log_id));
  } catch (err) {
    console.error('❌ deleteAuditLogs error:', err.message);
    return error('Database error');
  }
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  createAuditLog,
  getAuditLogs,
  updateAuditLog,
  deleteAuditLogs,
};