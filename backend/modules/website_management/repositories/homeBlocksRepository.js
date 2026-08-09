// modules/website_management/repositories/homeBlocksRepository.js

const db = require('../../../utils/db.js');

const TABLE = 'home_blocks';

/**
 * ======================================================
 * 🔹 LIST BLOCKS BY STATUS ('draft' | 'published')
 * ======================================================
 */
async function findByStatus(status) {
  try {
    const rows = await db.all(
      `SELECT * FROM ${TABLE} WHERE status = $1 ORDER BY z_index ASC, id ASC;`,
      [status]
    );
    return { success: true, data: rows };
  } catch (err) {
    console.error('❌ [homeBlocksRepository] findByStatus error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 FIND ONE DRAFT BLOCK BY ID
 * ======================================================
 */
async function findDraftById(id) {
  try {
    const row = await db.get(
      `SELECT * FROM ${TABLE} WHERE id = $1 AND status = 'draft';`,
      [id]
    );
    return { success: true, data: row };
  } catch (err) {
    console.error('❌ [homeBlocksRepository] findDraftById error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 CREATE DRAFT BLOCK
 * ======================================================
 */
async function create(block, userId) {
  try {
    const row = await db.get(
      `
      INSERT INTO ${TABLE}
        (status, block_type, text_content, images, pos_x, pos_y, width, height, z_index, style, created_by, updated_by)
      VALUES
        ('draft', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
      RETURNING *;
      `,
      [
        block.blockType,
        block.textContent ?? null,
        JSON.stringify(block.images ?? []),
        block.posX ?? 0,
        block.posY ?? 0,
        block.width ?? 30,
        block.height ?? 20,
        block.zIndex ?? 0,
        JSON.stringify(block.style ?? {}),
        userId ?? null,
      ]
    );
    return { success: true, data: row };
  } catch (err) {
    console.error('❌ [homeBlocksRepository] create error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 UPDATE DRAFT BLOCK (partial)
 * ======================================================
 */
async function update(id, changes, userId) {
  const fieldMap = {
    textContent: 'text_content',
    images: 'images',
    posX: 'pos_x',
    posY: 'pos_y',
    width: 'width',
    height: 'height',
    zIndex: 'z_index',
    style: 'style',
  };

  const setClauses = [];
  const params = [];
  let idx = 1;

  for (const [key, column] of Object.entries(fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(changes, key)) {
      let value = changes[key];
      if (key === 'images' || key === 'style') {
        value = JSON.stringify(value ?? (key === 'images' ? [] : {}));
      }
      setClauses.push(`${column} = $${idx}`);
      params.push(value);
      idx += 1;
    }
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
    console.error('❌ [homeBlocksRepository] update error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 DELETE DRAFT BLOCK
 * ======================================================
 */
async function remove(id) {
  try {
    await db.query(
      `DELETE FROM ${TABLE} WHERE id = $1 AND status = 'draft';`,
      [id]
    );
    return { success: true };
  } catch (err) {
    console.error('❌ [homeBlocksRepository] remove error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 PUBLISH — replace all 'published' rows with a copy of
 *    the current 'draft' rows. Runs inside a transaction.
 * ======================================================
 */
async function publish() {
  try {
    await db.transaction(async (client) => {
      await client.query(`DELETE FROM ${TABLE} WHERE status = 'published';`);
      await client.query(
        `
        INSERT INTO ${TABLE}
          (status, block_type, text_content, images, pos_x, pos_y, width, height, z_index, style, created_by, updated_by, created_at, updated_at)
        SELECT
          'published', block_type, text_content, images, pos_x, pos_y, width, height, z_index, style, created_by, updated_by, created_at, updated_at
        FROM ${TABLE}
        WHERE status = 'draft';
        `
      );
    });
    return { success: true };
  } catch (err) {
    console.error('❌ [homeBlocksRepository] publish error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 DISCARD DRAFT — wipe draft rows and re-copy from the
 *    last published version (revert unsaved changes).
 * ======================================================
 */
async function discardDraft() {
  try {
    await db.transaction(async (client) => {
      await client.query(`DELETE FROM ${TABLE} WHERE status = 'draft';`);
      await client.query(
        `
        INSERT INTO ${TABLE}
          (status, block_type, text_content, images, pos_x, pos_y, width, height, z_index, style, created_by, updated_by, created_at, updated_at)
        SELECT
          'draft', block_type, text_content, images, pos_x, pos_y, width, height, z_index, style, created_by, updated_by, created_at, updated_at
        FROM ${TABLE}
        WHERE status = 'published';
        `
      );
    });
    return { success: true };
  } catch (err) {
    console.error('❌ [homeBlocksRepository] discardDraft error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

module.exports = {
  findByStatus,
  findDraftById,
  create,
  update,
  remove,
  publish,
  discardDraft,
};
