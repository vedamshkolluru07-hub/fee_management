// modules/website_management/repositories/aboutBlocksRepository.js

const db = require('../../../utils/db.js');

const TABLE = 'about_blocks';

async function findByStatus(status) {
  try {
    const rows = await db.all(
      `SELECT * FROM ${TABLE} WHERE status = $1 ORDER BY display_order ASC, id ASC;`,
      [status]
    );
    return { success: true, data: rows };
  } catch (err) {
    console.error('❌ [aboutBlocksRepository] findByStatus error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

async function create(block, userId) {
  try {
    const row = await db.get(
      `
      INSERT INTO ${TABLE} (status, text_content, display_order, created_by, updated_by)
      VALUES ('draft', $1, $2, $3, $3)
      RETURNING *;
      `,
      [block.textContent ?? '', block.displayOrder ?? 0, userId ?? null]
    );
    return { success: true, data: row };
  } catch (err) {
    console.error('❌ [aboutBlocksRepository] create error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

async function update(id, changes, userId) {
  const setClauses = [];
  const params = [];
  let idx = 1;

  if (Object.prototype.hasOwnProperty.call(changes, 'textContent')) {
    setClauses.push(`text_content = $${idx}`);
    params.push(changes.textContent);
    idx += 1;
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'displayOrder')) {
    setClauses.push(`display_order = $${idx}`);
    params.push(changes.displayOrder);
    idx += 1;
  }

  if (!setClauses.length) {
    return { success: false, message: 'No fields to update' };
  }

  setClauses.push(`updated_by = $${idx}`);
  params.push(userId ?? null);
  idx += 1;
  setClauses.push(`updated_at = now()`);
  params.push(id);

  try {
    const row = await db.get(
      `
      UPDATE ${TABLE}
      SET ${setClauses.join(', ')}
      WHERE id = $${idx} AND status = 'draft'
      RETURNING *;
      `,
      params
    );
    return { success: true, data: row };
  } catch (err) {
    console.error('❌ [aboutBlocksRepository] update error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

async function remove(id) {
  try {
    await db.query(
      `DELETE FROM ${TABLE} WHERE id = $1 AND status = 'draft';`,
      [id]
    );
    return { success: true };
  } catch (err) {
    console.error('❌ [aboutBlocksRepository] remove error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

async function publish() {
  try {
    await db.transaction(async (client) => {
      await client.query(`DELETE FROM ${TABLE} WHERE status = 'published';`);
      await client.query(
        `
        INSERT INTO ${TABLE} (status, text_content, display_order, created_by, updated_by, created_at, updated_at)
        SELECT 'published', text_content, display_order, created_by, updated_by, created_at, updated_at
        FROM ${TABLE}
        WHERE status = 'draft';
        `
      );
    });
    return { success: true };
  } catch (err) {
    console.error('❌ [aboutBlocksRepository] publish error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

async function discardDraft() {
  try {
    await db.transaction(async (client) => {
      await client.query(`DELETE FROM ${TABLE} WHERE status = 'draft';`);
      await client.query(
        `
        INSERT INTO ${TABLE} (status, text_content, display_order, created_by, updated_by, created_at, updated_at)
        SELECT 'draft', text_content, display_order, created_by, updated_by, created_at, updated_at
        FROM ${TABLE}
        WHERE status = 'published';
        `
      );
    });
    return { success: true };
  } catch (err) {
    console.error('❌ [aboutBlocksRepository] discardDraft error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

module.exports = { findByStatus, create, update, remove, publish, discardDraft };
