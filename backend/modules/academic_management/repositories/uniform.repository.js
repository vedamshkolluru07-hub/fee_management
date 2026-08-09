const pool = require('../../../config/db.js');

const TABLE = 'uniforms';

/**
 * Returns transaction client if provided, otherwise uses global pool
 */
const exec = (client) => client || pool;

/**
 * ================= ROW MAPPER =================
 * Converts DB snake_case → camelCase object
 */
const mapRow = (r) => ({
  uniformId: r.uniform_id,
  academicYearId: r.academic_year_id,
  gender: r.gender,
  uniformType: r.uniform_type,
  sizes: r.sizes,
  uniformAmount: r.uniform_amount,
  isConnected: r.is_connected,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/**
 * =========================================================
 * CREATE UNIFORM(S)
 * =========================================================
 * INPUT:
 *  - data: object | array of objects
 *    {
 *      academicYearId: number (required),
 *      gender: 'Male' | 'Female' (required),
 *      uniformType: string (required),
 *      sizes?: string,
 *      uniformAmount?: number,
 *      isConnected?: boolean
 *    }
 *
 * OUTPUT:
 *  - single object OR array of objects
 *
 * DB ACTION:
 *  INSERT INTO uniforms (bulk via UNNEST)
 */
async function create(data, client = null) {
  const items = Array.isArray(data) ? data : [data];
  if (!items.length) return Array.isArray(data) ? [] : null;

  const academicYearId = [];
  const gender = [];
  const uniformType = [];
  const sizes = [];
  const uniformAmount = [];
  const isConnected = [];

  for (const i of items) {
    if (i?.academicYearId == null || !i?.gender || !i?.uniformType) {
      throw new Error('academicYearId, gender and uniformType are required');
    }

    academicYearId.push(i.academicYearId);
    gender.push(i.gender);
    uniformType.push(i.uniformType);
    sizes.push(i.sizes ?? null);
    uniformAmount.push(i.uniformAmount ?? 0);
    isConnected.push(i.isConnected ?? true);
  }

  const db = exec(client);

  const { rows } = await db.query(
    `
    INSERT INTO ${TABLE}
      (academic_year_id, gender, uniform_type, sizes, uniform_amount, is_connected)
    SELECT * FROM UNNEST(
      $1::int[],
      $2::text[],
      $3::text[],
      $4::text[],
      $5::numeric[],
      $6::boolean[]
    )
    RETURNING *
    `,
    [academicYearId, gender, uniformType, sizes, uniformAmount, isConnected]
  );

  return Array.isArray(data)
    ? rows.map(mapRow)
    : rows[0]
      ? mapRow(rows[0])
      : null;
}

/**
 * =========================================================
 * FIND ALL UNIFORMS
 * =========================================================
 */
async function findAll(client = null) {
  const db = exec(client);

  const { rows } = await db.query(
    `SELECT * FROM ${TABLE} ORDER BY uniform_id DESC`
  );

  return rows.map(mapRow);
}

/**
 * =========================================================
 * FIND BY ID
 * =========================================================
 */
async function findById(id, client = null) {
  const ids = Array.isArray(id) ? id : [id];
  if (!ids.length) return Array.isArray(id) ? [] : null;

  const db = exec(client);

  const { rows } = await db.query(
    `SELECT * FROM ${TABLE} WHERE uniform_id = ANY($1::int[])`,
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
 * FIND BY ACADEMIC YEAR
 * =========================================================
 */
async function findByAcademicYearId(academicYearId, client = null) {
  const ids = Array.isArray(academicYearId)
    ? academicYearId
    : [academicYearId];

  if (!ids.length) return [];

  const db = exec(client);

  const { rows } = await db.query(
    `
    SELECT * FROM ${TABLE}
    WHERE academic_year_id = ANY($1::int[])
    ORDER BY uniform_id DESC
    `,
    [ids]
  );

  return rows.map(mapRow);
}

/**
 * =========================================================
 * FILTER UNIFORMS
 * =========================================================
 * Supports dynamic filtering by:
 * - academicYearId
 * - gender
 * - uniformType
 * - sizes
 */
async function findByFilters(filters = {}, client = null) {
  const db = exec(client);

  const conditions = [];
  const values = [];
  let i = 1;

  const add = (col, val) => {
    if (val !== undefined && val !== null) {
      conditions.push(`${col} = $${i++}`);
      values.push(val);
    }
  };

  add('academic_year_id', filters.academicYearId);
  add('gender', filters.gender);
  add('uniform_type', filters.uniformType);
  add('sizes', filters.sizes);

  const query = `
    SELECT * FROM ${TABLE}
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ORDER BY uniform_id DESC
  `;

  const { rows } = await db.query(query, values);
  return rows.map(mapRow);
}

/**
 * =========================================================
 * UPDATE SINGLE UNIFORM
 * =========================================================
 */
async function updateSingle(id, data = {}, client = null) {
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

  add('gender', data.gender);
  add('uniform_type', data.uniformType);
  add('sizes', data.sizes);
  add('uniform_amount', data.uniformAmount);
  add('is_connected', data.isConnected);

  if (!fields.length) return null;

  values.push(id);

  const { rows } = await db.query(
    `
    UPDATE ${TABLE}
    SET ${fields.join(', ')}
    WHERE uniform_id = $${i}
    RETURNING *
    `,
    values
  );

  return rows[0] ? mapRow(rows[0]) : null;
}

/**
 * =========================================================
 * BULK UPDATE
 * =========================================================
 */
async function updateBulk(ids, items, client = null) {
  if (!Array.isArray(ids) || !Array.isArray(items)) return [];
  if (!ids.length || !items.length) return [];
  if (ids.length !== items.length) throw new Error('Bulk update mismatch');

  const gender = [];
  const uniformType = [];
  const sizes = [];
  const uniformAmount = [];
  const isConnected = [];

  for (const it of items) {
    if (!it?.gender || !it?.uniformType) {
      throw new Error('gender and uniformType are required');
    }

    gender.push(it.gender);
    uniformType.push(it.uniformType);
    sizes.push(it.sizes ?? null);
    uniformAmount.push(it.uniformAmount ?? 0);
    isConnected.push(it.isConnected ?? true);
  }

  const db = exec(client);

  const { rows } = await db.query(
    `
    UPDATE ${TABLE} u
    SET
      gender = v.gender,
      uniform_type = v.uniform_type,
      sizes = v.sizes,
      uniform_amount = v.uniform_amount,
      is_connected = v.is_connected
    FROM (
      SELECT * FROM UNNEST(
        $1::int[],
        $2::text[],
        $3::text[],
        $4::text[],
        $5::numeric[],
        $6::boolean[]
      ) AS t(
        id,
        gender,
        uniform_type,
        sizes,
        uniform_amount,
        is_connected
      )
    ) v
    WHERE u.uniform_id = v.id
    RETURNING u.*
    `,
    [ids, gender, uniformType, sizes, uniformAmount, isConnected]
  );

  return rows.map(mapRow);
}

/**
 * =========================================================
 * UNIFIED UPDATE WRAPPER
 * =========================================================
 */
async function update(id, data, client = null) {
  return Array.isArray(id)
    ? updateBulk(id, Array.isArray(data) ? data : [data], client)
    : updateSingle(id, data, client);
}

/**
 * =========================================================
 * DELETE BY ID
 * =========================================================
 */
async function remove(id, client = null) {
  const ids = Array.isArray(id) ? id : [id];
  if (!ids.length) return Array.isArray(id) ? [] : null;

  const db = exec(client);

  const { rows } = await db.query(
    `DELETE FROM ${TABLE} WHERE uniform_id = ANY($1::int[]) RETURNING *`,
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
 * DELETE BY ACADEMIC YEAR
 * =========================================================
 */
async function removeByAcademicYearId(academicYearId, client = null) {
  const ids = Array.isArray(academicYearId)
    ? academicYearId
    : [academicYearId];

  if (!ids.length) return [];

  const db = exec(client);

  const { rows } = await db.query(
    `DELETE FROM ${TABLE} WHERE academic_year_id = ANY($1::int[]) RETURNING *`,
    [ids]
  );

  return rows.map(mapRow);
}

/**
 * =========================================================
 * TOGGLE IS_CONNECTED
 * =========================================================
 */
async function updateIsConnected(id, isConnected, client = null) {
  const ids = Array.isArray(id) ? id : [id];
  if (!ids.length) return Array.isArray(id) ? [] : null;

  const db = exec(client);

  const { rows } = await db.query(
    `
    UPDATE ${TABLE}
    SET is_connected = $1
    WHERE uniform_id = ANY($2::int[])
    RETURNING *
    `,
    [isConnected, ids]
  );

  return rows.map(mapRow);
}

/**
 * =========================================================
 * CHECK CONNECTION STATUS
 * =========================================================
 */
async function checkIsConnected(id, client = null) {
  const ids = Array.isArray(id) ? id : [id];
  if (!ids.length) return Array.isArray(id) ? [] : null;

  const db = exec(client);

  const { rows } = await db.query(
    `
    SELECT uniform_id, is_connected
    FROM ${TABLE}
    WHERE uniform_id = ANY($1::int[])
    `,
    [ids]
  );

  const mapped = rows.map(r => ({
    uniformId: r.uniform_id,
    isConnected: r.is_connected,
  }));

  return Array.isArray(id) ? mapped : mapped[0] || null;
}

/**
 * ================= EXPORTS =================
 */
module.exports = {
  create,
  findAll,
  findById,
  findByAcademicYearId,
  findByFilters,
  update,
  remove,
  removeByAcademicYearId,
  updateIsConnected,
  checkIsConnected,
};