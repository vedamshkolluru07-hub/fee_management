// modules/website_management/repositories/enquiryTypeRepository.js

const db = require('../../../utils/db.js');

const TABLE = 'enquiry_types';

async function findAllActive() {
  try {
    const rows = await db.all(
      `SELECT * FROM ${TABLE} WHERE is_active = true ORDER BY display_order ASC, id ASC;`
    );
    return { success: true, data: rows };
  } catch (err) {
    console.error('❌ [enquiryTypeRepository] findAllActive error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

async function findAll() {
  try {
    const rows = await db.all(
      `SELECT * FROM ${TABLE} ORDER BY display_order ASC, id ASC;`
    );
    return { success: true, data: rows };
  } catch (err) {
    console.error('❌ [enquiryTypeRepository] findAll error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

async function findById(id) {
  try {
    const row = await db.get(`SELECT * FROM ${TABLE} WHERE id = $1;`, [id]);
    return { success: true, data: row };
  } catch (err) {
    console.error('❌ [enquiryTypeRepository] findById error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

async function create({ code, label, displayOrder }) {
  try {
    const row = await db.get(
      `
      INSERT INTO ${TABLE} (code, label, display_order, is_active)
      VALUES ($1, $2, $3, true)
      RETURNING *;
      `,
      [code, label, displayOrder ?? 0]
    );
    return { success: true, data: row };
  } catch (err) {
    console.error('❌ [enquiryTypeRepository] create error:', err.message);
    return { success: false, message: 'Database error (code may already exist)' };
  }
}

async function update(id, { label, displayOrder, isActive }) {
  const setClauses = [];
  const params = [];
  let idx = 1;

  if (label !== undefined) { setClauses.push(`label = $${idx}`); params.push(label); idx += 1; }
  if (displayOrder !== undefined) { setClauses.push(`display_order = $${idx}`); params.push(displayOrder); idx += 1; }
  if (isActive !== undefined) { setClauses.push(`is_active = $${idx}`); params.push(isActive); idx += 1; }

  if (!setClauses.length) {
    return { success: false, message: 'No fields to update' };
  }

  params.push(id);

  try {
    const row = await db.get(
      `UPDATE ${TABLE} SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *;`,
      params
    );
    return { success: true, data: row };
  } catch (err) {
    console.error('❌ [enquiryTypeRepository] update error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

module.exports = { findAllActive, findAll, findById, create, update };
