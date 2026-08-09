// modules/website_management/repositories/siteThemeRepository.js

const db = require('../../../utils/db.js');

const TABLE = 'site_theme';

async function find() {
  try {
    const row = await db.get(`SELECT * FROM ${TABLE} WHERE id = 1;`);
    return { success: true, data: row };
  } catch (err) {
    console.error('❌ [siteThemeRepository] find error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

async function update({ primaryColor, secondaryColor, backgroundColor, textColor }) {
  try {
    const row = await db.get(
      `
      UPDATE ${TABLE}
      SET primary_color = COALESCE($1, primary_color),
          secondary_color = COALESCE($2, secondary_color),
          background_color = COALESCE($3, background_color),
          text_color = COALESCE($4, text_color),
          updated_at = now()
      WHERE id = 1
      RETURNING *;
      `,
      [primaryColor ?? null, secondaryColor ?? null, backgroundColor ?? null, textColor ?? null]
    );
    return { success: true, data: row };
  } catch (err) {
    console.error('❌ [siteThemeRepository] update error:', err.message);
    return { success: false, message: 'Database error' };
  }
}

module.exports = { find, update };
