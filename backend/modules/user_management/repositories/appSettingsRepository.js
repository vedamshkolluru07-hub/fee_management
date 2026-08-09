// repositories/appSettingsRepository.js

const db = require('../../../utils/db.js');

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  restrict_user_creation: '0',
  user_limit: '100',
  restrict_admin_creation: '0',
  admin_limit: '2',
};

const ALLOWED_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));

const TABLE = 'AppSettings';
const COL_KEY = 'setting_key';
const COL_VALUE = 'setting_value';

/**
 * ======================================================
 * 🔹 INITIALIZE DEFAULT SETTINGS (BULK UPSERT)
 * ======================================================
 */
async function initializeDefaults() {
  try {
    const entries = Object.entries(DEFAULT_SETTINGS);

    const valuesClause = entries
      .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
      .join(', ');

    const params = entries.flatMap(([key, value]) => [key, value]);

    await db.query(
      `
      INSERT INTO ${TABLE} (${COL_KEY}, ${COL_VALUE})
      VALUES ${valuesClause}
      ON CONFLICT (${COL_KEY}) DO NOTHING;
      `,
      params
    );

    return { success: true };
  } catch (err) {
    console.error('❌ initializeDefaults error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 CREATE / UPSERT SETTING
 * ======================================================
 */
async function create(key, value) {
  if (!ALLOWED_KEYS.has(key)) {
    return { success: false, message: `Invalid key: ${key}` };
  }

  try {
    await db.query(
      `
      INSERT INTO ${TABLE} (${COL_KEY}, ${COL_VALUE})
      VALUES ($1, $2)
      ON CONFLICT (${COL_KEY})
      DO UPDATE SET ${COL_VALUE} = EXCLUDED.${COL_VALUE};
      `,
      [key, String(value)]
    );

    return { success: true };
  } catch (err) {
    console.error('❌ create setting error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 GET BY KEY
 * ======================================================
 */
async function findByKey(key) {
  if (!ALLOWED_KEYS.has(key)) {
    return { success: false, message: `Invalid key: ${key}` };
  }

  try {
    const result = await db.query(
      `
      SELECT ${COL_KEY} AS key, ${COL_VALUE} AS value
      FROM ${TABLE}
      WHERE ${COL_KEY} = $1;
      `,
      [key]
    );

    return {
      success: true,
      data: result.rows[0] || null,
    };
  } catch (err) {
    console.error('❌ findByKey error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 UPDATE SETTING
 * ======================================================
 */
async function update(key, newValue) {
  if (!ALLOWED_KEYS.has(key)) {
    return { success: false, message: `Invalid key: ${key}` };
  }

  try {
    await db.query(
      `
      UPDATE ${TABLE}
      SET ${COL_VALUE} = $1
      WHERE ${COL_KEY} = $2;
      `,
      [String(newValue), key]
    );

    return { success: true };
  } catch (err) {
    console.error('❌ update setting error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

/**
 * ======================================================
 * 🔹 HELPERS (TYPED SETTINGS)
 * ======================================================
 */
async function getRestrictUserCreation() {
  const result = await findByKey('restrict_user_creation');

  if (!result.success || !result.data) {
    return DEFAULT_SETTINGS.restrict_user_creation === '1';
  }

  const val = String(result.data.value).toLowerCase();
  return val === 'true' || val === '1';
}

async function getUserLimit() {
  const result = await findByKey('user_limit');

  if (!result.success || !result.data) {
    return Number(DEFAULT_SETTINGS.user_limit);
  }

  return Number(result.data.value);
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  initializeDefaults,
  create,
  findByKey,
  update,
  getRestrictUserCreation,
  getUserLimit,
};