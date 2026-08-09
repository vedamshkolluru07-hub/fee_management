// modules/website_management/repositories/enquiryRepository.js

const db = require('../../../utils/db.js');

const TABLE = 'enquiries';

/**
 * ======================================================
 * 🔹 CREATE (public submission)
 * ======================================================
 */
async function create({ phone, message, enquiryTypeId }) {
  try {
    const row = await db.get(
      `
      INSERT INTO ${TABLE} (phone, message, enquiry_type_id, status, deleted)
      VALUES ($1, $2, $3, 'new', false)
      RETURNING *;
      `,
      [phone, message, enquiryTypeId]
    );
    return { success: true, data: row };
  } catch (err) {
    console.error('❌ [enquiryRepository] create error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 LIST (admin) — filter by status / enquiryTypeId, paginated
 * ======================================================
 */
async function findAll({ status, enquiryTypeId, search, page = 1, pageSize = 20 } = {}) {
  const whereClauses = ['e.deleted = false'];
  const params = [];
  let idx = 1;

  if (status) {
    whereClauses.push(`e.status = $${idx}`);
    params.push(status);
    idx += 1;
  }
  if (enquiryTypeId) {
    whereClauses.push(`e.enquiry_type_id = $${idx}`);
    params.push(enquiryTypeId);
    idx += 1;
  }
  if (search) {
    whereClauses.push(`e.phone ILIKE $${idx}`);
    params.push(`%${search}%`);
    idx += 1;
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const offset = (Math.max(1, page) - 1) * pageSize;

  try {
    const countRow = await db.get(
      `SELECT COUNT(*)::int AS total FROM ${TABLE} e ${whereSql};`,
      params
    );

    const rows = await db.all(
      `
      SELECT e.*, t.code AS enquiry_type_code, t.label AS enquiry_type_label
      FROM ${TABLE} e
      JOIN enquiry_types t ON t.id = e.enquiry_type_id
      ${whereSql}
      ORDER BY e.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
      `,
      [...params, pageSize, offset]
    );

    return {
      success: true,
      data: rows,
      pagination: { page, pageSize, total: countRow?.total ?? 0 },
    };
  } catch (err) {
    console.error('❌ [enquiryRepository] findAll error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 UPDATE STATUS (admin)
 * ======================================================
 */
async function updateStatus(id, status) {
  try {
    const row = await db.get(
      `
      UPDATE ${TABLE}
      SET status = $1, updated_at = now()
      WHERE id = $2 AND deleted = false
      RETURNING *;
      `,
      [status, id]
    );
    return { success: true, data: row };
  } catch (err) {
    console.error('❌ [enquiryRepository] updateStatus error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 SOFT DELETE (admin)
 * ======================================================
 */
async function softDelete(id) {
  try {
    await db.query(
      `UPDATE ${TABLE} SET deleted = true, updated_at = now() WHERE id = $1;`,
      [id]
    );
    return { success: true };
  } catch (err) {
    console.error('❌ [enquiryRepository] softDelete error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

module.exports = { create, findAll, updateStatus, softDelete };
