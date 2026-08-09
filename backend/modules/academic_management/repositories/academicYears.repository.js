const pool = require('../../../config/db.js');

const TABLE = 'academic_years';

const { importHolidaysForLabel } = require("../../../job/holidayImporter.js");

/**
 * Returns either a provided transaction client or the global pool.
 */
const exec = (client) => client || pool;

/**
 * ================= ROW MAPPER =================
 * Converts DB snake_case row → application camelCase object
 */
const mapRow = (r) => ({
  academicYearId: r.academic_year_id,
  yearLabel: r.year_label,
  startDate: r.start_date,
  endDate: r.end_date,
  isConnected: r.is_connected,
  isCurrentYear: r.is_current_year,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/**
 * =========================================================
 * CREATE ACADEMIC YEAR(S)
 * =========================================================
 * INPUT:
 *  - data: object | array of objects
 *    {
 *      yearLabel: string (required),
 *      startDate: date (required),
 *      endDate?: date,
 *      isConnected?: boolean,
 *      isCurrentYear?: boolean
 *    }
 *
 * OUTPUT:
 *  - single object (if input object)
 *  - array of objects (if input array)
 *
 * DB ACTION:
 *  INSERT INTO academic_years (bulk via UNNEST)
 */
async function create(data, client = null) {
  const items = Array.isArray(data) ? data : [data];
  if (!items.length) return Array.isArray(data) ? [] : null;

  const yearLabel = [];
  const startDate = [];
  const endDate = [];
  const isConnected = [];
  const isCurrentYear = [];

  for (const i of items) {
    if (!i?.yearLabel || !i?.startDate) {
      throw new Error('yearLabel and startDate are required');
    }
    yearLabel.push(i.yearLabel);
    startDate.push(i.startDate);
    endDate.push(i.endDate ?? null);
    isConnected.push(i.isConnected ?? true);
    isCurrentYear.push(i.isCurrentYear ?? false);
  }

  const db = exec(client);
  const { rows } = await db.query(
    `
    INSERT INTO ${TABLE}
      (year_label, start_date, end_date, is_connected, is_current_year)
    SELECT * FROM UNNEST(
      $1::text[],
      $2::date[],
      $3::date[],
      $4::boolean[],
      $5::boolean[]
    )
    RETURNING *
    `,
    [yearLabel, startDate, endDate, isConnected, isCurrentYear]
  );

  console.log(`[AcademicYears.create] Inserted ${rows.length} row(s):`, rows.map(r => ({ id: r.academic_year_id, label: r.year_label })));

  // ================= Auto-import holidays for each newly created academic year =================
  for (const row of rows) {
    console.log(`[AcademicYears.create] Triggering holiday import for academic_year_id=${row.academic_year_id}, year_label=${row.year_label}`);
    try {
      await importHolidaysForLabel(row.year_label, row.academic_year_id, client);
      console.log(`[AcademicYears.create] Holiday import finished for ${row.year_label}`);
    } catch (err) {
      console.error(`[AcademicYears.create] ❌ Holiday import failed for ${row.year_label}:`, err.message);
      console.error(err.stack);
    }
  }

  return Array.isArray(data)
    ? rows.map(mapRow)
    : rows[0]
      ? mapRow(rows[0])
      : null;
}
/**
 * =========================================================
 * GET ALL ACADEMIC YEARS
 * =========================================================
 * INPUT: none
 * OUTPUT: array of academic years
 * DB ACTION: SELECT * ORDER BY newest first
 */
async function findAll(client = null) {
  const db = exec(client);

  const { rows } = await db.query(
    `SELECT * FROM ${TABLE} ORDER BY academic_year_id DESC`
  );

  return rows.map(mapRow);
}

/**
 * =========================================================
 * GET ACADEMIC YEAR(S) BY ID
 * =========================================================
 * INPUT:
 *  - id: number | number[]
 *
 * OUTPUT:
 *  - single object OR array of objects
 *
 * DB ACTION:
 *  SELECT WHERE academic_year_id = ANY($1)
 */
async function findById(id, client = null) {
  const ids = Array.isArray(id) ? id : [id];
  if (!ids.length) return Array.isArray(id) ? [] : null;

  const db = exec(client);

  const { rows } = await db.query(
    `SELECT * FROM ${TABLE} WHERE academic_year_id = ANY($1::int[])`,
    [ids]
  );

  return Array.isArray(id)
    ? rows.map(mapRow)
    : rows[0]
      ? mapRow(rows[0])
      : null;
}

/**
 * =========================================================
 * GET CURRENT ACADEMIC YEAR
 * =========================================================
 * INPUT: none
 * OUTPUT: single academic year object or null
 * DB ACTION: SELECT WHERE is_current_year = TRUE LIMIT 1
 */
async function findByCurrentYear(client = null) {
  const db = exec(client);

  const { rows } = await db.query(
    `SELECT * FROM ${TABLE} WHERE is_current_year = TRUE LIMIT 1`
  );

  return rows[0] ? mapRow(rows[0]) : null;
}

/**
 * =========================================================
 * UPDATE SINGLE ACADEMIC YEAR
 * =========================================================
 * INPUT:
 *  - id: number (required)
 *  - data:
 *    {
 *      yearLabel?: string,
 *      startDate?: date,
 *      endDate?: date,
 *      isConnected?: boolean,
 *      isCurrentYear?: boolean
 *    }
 *
 * OUTPUT:
 *  - updated academic year object OR null
 *
 * DB ACTION:
 *  dynamic UPDATE query
 */
async function updateSingle(id, data = {}, client = null) {
  if (!id) throw new Error('academicYearId is required');

  const db = exec(client);

  const fields = [];
  const values = [];
  let i = 1;

  const add = (col, val) => {
    if (val !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(val);
    }
  };

  add('year_label', data.yearLabel);
  add('start_date', data.startDate);
  add('end_date', data.endDate);
  add('is_connected', data.isConnected);
  add('is_current_year', data.isCurrentYear);

  if (!fields.length) return null;

  values.push(id);

  const { rows } = await db.query(
    `
    UPDATE ${TABLE}
    SET ${fields.join(', ')}
    WHERE academic_year_id = $${i}
    RETURNING *
    `,
    values
  );

  return rows[0] ? mapRow(rows[0]) : null;
}

/**
 * =========================================================
 * BULK UPDATE ACADEMIC YEARS
 * =========================================================
 * INPUT:
 *  - ids: number[]
 *  - items: array of objects (same length as ids)
 *
 * OUTPUT:
 *  - array of updated records
 *
 * DB ACTION:
 *  UPDATE via UNNEST + JOIN
 */
async function updateBulk(ids, items, client = null) {
  if (!Array.isArray(ids) || !Array.isArray(items)) return [];
  if (!ids.length || !items.length) return [];
  if (ids.length !== items.length) {
    throw new Error('Bulk update mismatch');
  }

  const idArr = [];
  const yearLabel = [];
  const startDate = [];
  const endDate = [];
  const isConnected = [];
  const isCurrentYear = [];

  for (let i = 0; i < ids.length; i++) {
    const it = items[i];

    if (!it?.yearLabel || !it?.startDate) {
      throw new Error('yearLabel and startDate are required');
    }

    idArr.push(ids[i]);
    yearLabel.push(it.yearLabel);
    startDate.push(it.startDate);
    endDate.push(it.endDate ?? null);
    isConnected.push(it.isConnected ?? true);
    isCurrentYear.push(it.isCurrentYear ?? false);
  }

  const db = exec(client);

  const { rows } = await db.query(
    `
    UPDATE ${TABLE} a
    SET
      year_label = v.year_label,
      start_date = v.start_date,
      end_date = v.end_date,
      is_connected = v.is_connected,
      is_current_year = v.is_current_year
    FROM (
      SELECT * FROM UNNEST(
        $1::int[],
        $2::text[],
        $3::date[],
        $4::date[],
        $5::boolean[],
        $6::boolean[]
      ) AS t(
        id,
        year_label,
        start_date,
        end_date,
        is_connected,
        is_current_year
      )
    ) v
    WHERE a.academic_year_id = v.id
    RETURNING a.*
    `,
    [idArr, yearLabel, startDate, endDate, isConnected, isCurrentYear]
  );

  return rows.map(mapRow);
}

/**
 * =========================================================
 * UNIFIED UPDATE WRAPPER
 * =========================================================
 * INPUT:
 *  - id: number | number[]
 *  - data: object | object[]
 *
 * OUTPUT:
 *  - single object OR array
 *
 * LOGIC:
 *  routes to single or bulk update
 */
async function update(id, data, client = null) {
  const normalized = Array.isArray(data) ? data : [data];

  return Array.isArray(id)
    ? updateBulk(id, normalized, client)
    : updateSingle(id, data, client);
}

/**
 * =========================================================
 * DELETE ACADEMIC YEAR(S)
 * =========================================================
 * INPUT:
 *  - id: number | number[]
 *
 * OUTPUT:
 *  - deleted record(s)
 *
 * DB ACTION:
 *  DELETE WHERE id IN (...)
 */
async function remove(id, client = null) {
  const ids = Array.isArray(id) ? id : [id];
  if (!ids.length) return Array.isArray(id) ? [] : null;

  const db = exec(client);

  const { rows } = await db.query(
    `DELETE FROM ${TABLE} WHERE academic_year_id = ANY($1::int[]) RETURNING *`,
    [ids]
  );

  return Array.isArray(id)
    ? rows.map(mapRow)
    : rows[0]
      ? mapRow(rows[0])
      : null;
}

/**
 * =========================================================
 * SET CURRENT ACADEMIC YEAR (TRANSACTION SAFE)
 * =========================================================
 * INPUT:
 *  - id: number
 *
 * OUTPUT:
 *  - updated academic year marked as current
 *
 * DB ACTION:
 *  1. Set all is_current_year = false
 *  2. Set selected id = true
 */
async function setCurrentYear(id, client = null) {
  if (!id) throw new Error('academicYearId is required');

  const conn = client || (await pool.connect());

  try {
    await conn.query('BEGIN');

    await conn.query(
      `UPDATE ${TABLE} SET is_current_year = FALSE`
    );

    const { rows } = await conn.query(
      `
      UPDATE ${TABLE}
      SET is_current_year = TRUE
      WHERE academic_year_id = $1
      RETURNING *
      `,
      [id]
    );

    await conn.query('COMMIT');

    return rows[0] ? mapRow(rows[0]) : null;
  } catch (err) {
    await conn.query('ROLLBACK');
    throw err;
  } finally {
    if (!client) conn.release();
  }
}

/**
 * =========================================================
 * UPDATE CONNECTION STATUS
 * =========================================================
 * INPUT:
 *  - id: number | number[]
 *  - isConnected: boolean
 *
 * OUTPUT:
 *  - updated record(s)
 *
 * DB ACTION:
 *  UPDATE is_connected field
 */
async function updateIsConnected(id, isConnected, client = null) {
  const ids = Array.isArray(id) ? id : [id];
  if (!ids.length) return Array.isArray(id) ? [] : null;

  const db = exec(client);

  const { rows } = await db.query(
    `
    UPDATE ${TABLE}
    SET is_connected = $1
    WHERE academic_year_id = ANY($2::int[])
    RETURNING *
    `,
    [isConnected, ids]
  );

  return Array.isArray(id)
    ? rows.map(mapRow)
    : rows[0]
      ? mapRow(rows[0])
      : null;
}

module.exports = {
  create,
  findAll,
  findById,
  findByCurrentYear,
  update,
  remove,
  updateIsConnected,
  setCurrentYear,
};