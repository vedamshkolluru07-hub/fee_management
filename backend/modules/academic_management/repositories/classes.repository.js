const pool = require('../../../config/db.js');

const TABLE = 'classes';

/**
 * =========================================================
 * SAFE DB RESOLVER
 * Ensures we always use a valid pg Pool or Client
 * =========================================================
 */
const getDb = (client) => {
  const db = client || pool;

  if (!db || typeof db.query !== 'function') {
    throw new Error('Invalid DB client: db.query is not a function');
  }

  return db;
};

/**
 * ================= ROW MAPPER =================
 */
const mapRow = (r) => ({
  classId: r.class_id,
  academicYearId: r.academic_year_id,
  className: r.class_name,
  feeAmount: r.fee_amount,
  isConnected: r.is_connected,
  isFinanceConnected: r.is_finance_connected,
  createdAt: r.created_at,
});

/**
 * =========================================================
 * CREATE CLASS(ES)
 * =========================================================
 */
async function create(data, client = null) {
  const items = Array.isArray(data) ? data : [data];
  if (!items.length) return Array.isArray(data) ? [] : null;

  const academicYearId = [];
  const className = [];
  const feeAmount = [];
  const isConnected = [];

  for (const i of items) {
    if (i.academicYearId == null) throw new Error('academicYearId is required');
    if (!i.className) throw new Error('className is required');

    academicYearId.push(i.academicYearId);
    className.push(i.className);
    feeAmount.push(i.feeAmount ?? 0);
    isConnected.push(i.isConnected ?? false);
  }

  const db = getDb(client);

  const { rows } = await db.query(
    `
    INSERT INTO ${TABLE}
      (academic_year_id, class_name, fee_amount, is_connected)
    SELECT * FROM UNNEST(
      $1::int[],
      $2::text[],
      $3::numeric[],
      $4::boolean[]
    )
    RETURNING *
    `,
    [academicYearId, className, feeAmount, isConnected]
  );

  return Array.isArray(data)
    ? rows.map(mapRow)
    : rows[0]
      ? mapRow(rows[0])
      : null;
}

/**
 * =========================================================
 * FIND ALL
 * =========================================================
 */
async function findAll(client = null) {
  const db = getDb(client);

  const { rows } = await db.query(
    `SELECT * FROM ${TABLE} ORDER BY class_id DESC`
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

  const db = getDb(client);

  const { rows } = await db.query(
    `SELECT * FROM ${TABLE} WHERE class_id = ANY($1::int[])`,
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

  const db = getDb(client);

  const { rows } = await db.query(
    `
    SELECT * FROM ${TABLE}
    WHERE academic_year_id = ANY($1::int[])
    ORDER BY class_id DESC
    `,
    [ids]
  );

  return rows.map(mapRow);
}

/**
 * =========================================================
 * UPDATE SINGLE
 * =========================================================
 */
async function updateSingle(id, data = {}, client = null) {
  const db = getDb(client);

  const fields = [];
  const values = [];
  let i = 1;

  const add = (col, val) => {
    if (val !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(val);
    }
  };

  add('academic_year_id', data.academicYearId);
  add('class_name', data.className);
  add('fee_amount', data.feeAmount);
  add('is_connected', data.isConnected);
  add('is_finance_connected', data.isFinanceConnected);

  if (!fields.length) return null;

  values.push(id);

  const { rows } = await db.query(
    `
    UPDATE ${TABLE}
    SET ${fields.join(', ')}
    WHERE class_id = $${i}
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
  if (ids.length !== items.length) throw new Error('Bulk update mismatch');

  const academicYearId = [];
  const className = [];
  const feeAmount = [];
  const isConnected = [];

  for (const it of items) {
    if (it.academicYearId == null) throw new Error('academicYearId is required');
    if (!it.className) throw new Error('className is required');

    academicYearId.push(it.academicYearId);
    className.push(it.className);
    feeAmount.push(it.feeAmount ?? 0);
    isConnected.push(it.isConnected ?? false);
  }

  const db = getDb(client);

  const { rows } = await db.query(
    `
    UPDATE ${TABLE} c
    SET
      academic_year_id = v.academic_year_id,
      class_name = v.class_name,
      fee_amount = v.fee_amount,
      is_connected = v.is_connected
    FROM (
      SELECT * FROM UNNEST(
        $1::int[],
        $2::text[],
        $3::numeric[],
        $4::boolean[]
      ) AS t(
        id,
        academic_year_id,
        class_name,
        fee_amount,
        is_connected
      )
    ) v
    WHERE c.class_id = v.id
    RETURNING c.*
    `,
    [ids, academicYearId, className, feeAmount, isConnected]
  );

  return rows.map(mapRow);
}

/**
 * =========================================================
 * UPDATE WRAPPER
 * =========================================================
 */
async function update(id, data, client = null) {
  return Array.isArray(id)
    ? updateBulk(id, Array.isArray(data) ? data : [data], client)
    : updateSingle(id, data, client);
}

/**
 * =========================================================
 * DELETE
 * =========================================================
 */
async function remove(id, client = null) {
  const ids = Array.isArray(id) ? id : [id];
  if (!ids.length) return Array.isArray(id) ? [] : null;

  const db = getDb(client);

  const { rows } = await db.query(
    `
    DELETE FROM ${TABLE}
    WHERE class_id = ANY($1::int[])
    RETURNING *
    `,
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
 * FLAGS
 * =========================================================
 */
async function updateIsConnected(id, isConnected, client = null) {
  const ids = Array.isArray(id) ? id : [id];
  const db = getDb(client);

  const { rows } = await db.query(
    `
    UPDATE ${TABLE}
    SET is_connected = $1
    WHERE class_id = ANY($2::int[])
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

async function updateIsFinanceConnected(id, isFinanceConnected, client = null) {
  const ids = Array.isArray(id) ? id : [id];
  const db = getDb(client);

  const { rows } = await db.query(
    `
    UPDATE ${TABLE}
    SET is_finance_connected = $1
    WHERE class_id = ANY($2::int[])
    RETURNING *
    `,
    [isFinanceConnected, ids]
  );

  return Array.isArray(id)
    ? rows.map(mapRow)
    : rows[0]
      ? mapRow(rows[0])
      : null;
}

/**
 * =========================================================
 * CHECKS
 * =========================================================
 */
async function checkIsConnected(id, client = null) {
  const ids = Array.isArray(id) ? id : [id];
  const db = getDb(client);

  const { rows } = await db.query(
    `
    SELECT class_id, is_connected
    FROM ${TABLE}
    WHERE class_id = ANY($1::int[])
    `,
    [ids]
  );

  const mapped = rows.map(r => ({
    classId: r.class_id,
    isConnected: r.is_connected,
  }));

  return Array.isArray(id) ? mapped : mapped[0] || null;
}

async function checkIsFinanceConnected(id, client = null) {
  const ids = Array.isArray(id) ? id : [id];
  const db = getDb(client);

  const { rows } = await db.query(
    `
    SELECT class_id, is_finance_connected
    FROM ${TABLE}
    WHERE class_id = ANY($1::int[])
    `,
    [ids]
  );

  const mapped = rows.map(r => ({
    classId: r.class_id,
    isFinanceConnected: r.is_finance_connected,
  }));

  return Array.isArray(id) ? mapped : mapped[0] || null;
}

module.exports = {
  create,
  findAll,
  findById,
  findByAcademicYearId,
  update,
  remove,
  updateIsConnected,
  updateIsFinanceConnected,
  checkIsConnected,
  checkIsFinanceConnected,
};