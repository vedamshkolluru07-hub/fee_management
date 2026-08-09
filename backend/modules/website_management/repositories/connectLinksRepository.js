// modules/website_management/repositories/connectLinksRepository.js

const db = require('../../../utils/db.js');

const TABLE = 'connect_links';

/**
 * ======================================================
 * 🔹 PUBLIC — only enabled links with a real value
 * ======================================================
 */
async function findEnabled() {
  try {
    const rows = await db.all(
      `
      SELECT platform, value, display_order
      FROM ${TABLE}
      WHERE is_enabled = true AND value <> ''
      ORDER BY display_order ASC;
      `
    );
    return { success: true, data: rows };
  } catch (err) {
    console.error('❌ [connectLinksRepository] findEnabled error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 ADMIN — all platforms (enabled or not)
 * ======================================================
 */
async function findAll() {
  try {
    const rows = await db.all(`SELECT * FROM ${TABLE} ORDER BY display_order ASC;`);
    return { success: true, data: rows };
  } catch (err) {
    console.error('❌ [connectLinksRepository] findAll error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 ADMIN — upsert a platform's value / enabled flag
 * ======================================================
 */
async function upsert(platform, { value, isEnabled }) {
  try {
    const row = await db.get(
      `
      UPDATE ${TABLE}
      SET value = COALESCE($2, value),
          is_enabled = COALESCE($3, is_enabled),
          updated_at = now()
      WHERE platform = $1
      RETURNING *;
      `,
      [platform, value ?? null, isEnabled ?? null]
    );
    return { success: true, data: row };
  } catch (err) {
    console.error('❌ [connectLinksRepository] upsert error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

module.exports = { findEnabled, findAll, upsert };
