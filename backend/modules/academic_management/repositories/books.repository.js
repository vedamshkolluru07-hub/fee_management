const pool = require('../../../config/db.js');

const TABLE = 'books';

/**
 * Returns transaction client if provided, otherwise uses global pool
 */
const exec = (client) => client || pool;

/**
 * ================= ROW MAPPER =================
 * Converts DB snake_case → application camelCase
 */
const mapRow = (r) => ({
  bookId: r.book_id,
  classId: r.class_id,
  bookType: r.book_type,
  bookAmount: r.book_amount,
  isConnected: r.is_connected,
  createdAt: r.created_at,
});

/**
 * =========================================================
 * CREATE BOOK(S)
 * =========================================================
 * INPUT:
 *  - data: object | array of objects
 *    {
 *      classId: number (required),
 *      bookType: string (required),
 *      bookAmount?: number,
 *      isConnected?: boolean
 *    }
 *
 * OUTPUT:
 *  - single object OR array of objects
 *
 * DB ACTION:
 *  INSERT INTO books (bulk via UNNEST)
 */
async function create(data, client = null) {
  const items = Array.isArray(data) ? data : [data];
  if (!items.length) return Array.isArray(data) ? [] : null;

  const classId = [];
  const bookType = [];
  const bookAmount = [];
  const isConnected = [];

  for (const i of items) {
    if (!i?.classId) throw new Error('classId is required');
    if (!i?.bookType) throw new Error('bookType is required');

    classId.push(i.classId);
    bookType.push(i.bookType);
    bookAmount.push(i.bookAmount ?? 0);
    isConnected.push(i.isConnected ?? false);
  }

  const db = exec(client);

  const { rows } = await db.query(
    `
    INSERT INTO ${TABLE}
      (class_id, book_type, book_amount, is_connected)
    SELECT * FROM UNNEST(
      $1::int[],
      $2::text[],
      $3::numeric[],
      $4::boolean[]
    )
    RETURNING *
    `,
    [classId, bookType, bookAmount, isConnected]
  );

  return Array.isArray(data)
    ? rows.map(mapRow)
    : rows[0]
      ? mapRow(rows[0])
      : null;
}

/**
 * =========================================================
 * FIND ALL BOOKS
 * =========================================================
 * INPUT: none
 * OUTPUT: array of books
 */
async function findAll(client = null) {
  const db = exec(client);

  const { rows } = await db.query(
    `SELECT * FROM ${TABLE} ORDER BY book_id DESC`
  );

  return rows.map(mapRow);
}

/**
 * =========================================================
 * FIND BOOK(S) BY ID
 * =========================================================
 * INPUT:
 *  - id: number | number[]
 *
 * OUTPUT:
 *  - single object OR array
 */
async function findById(id, client = null) {
  const ids = Array.isArray(id) ? id : [id];
  if (!ids.length) return Array.isArray(id) ? [] : null;

  const db = exec(client);

  const { rows } = await db.query(
    `SELECT * FROM ${TABLE} WHERE book_id = ANY($1::int[])`,
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
 * FIND BOOKS BY CLASS ID
 * =========================================================
 * INPUT:
 *  - classId: number | number[]
 *
 * OUTPUT:
 *  - array of books
 */
async function findByClassId(classId, client = null) {
  const ids = Array.isArray(classId) ? classId : [classId];
  if (!ids.length) return [];

  const db = exec(client);

  const { rows } = await db.query(
    `SELECT * FROM ${TABLE} WHERE class_id = ANY($1::int[])`,
    [ids]
  );

  return rows.map(mapRow);
}

/**
 * =========================================================
 * UPDATE SINGLE BOOK
 * =========================================================
 * INPUT:
 *  - id: number
 *  - data:
 *    {
 *      classId?: number,
 *      bookType?: string,
 *      bookAmount?: number,
 *      isConnected?: boolean
 *    }
 *
 * OUTPUT:
 *  - updated book object OR null
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

  add('class_id', data.classId);
  add('book_type', data.bookType);
  add('book_amount', data.bookAmount);
  add('is_connected', data.isConnected);

  if (!fields.length) return null;

  values.push(id);

  const { rows } = await db.query(
    `
    UPDATE ${TABLE}
    SET ${fields.join(', ')}
    WHERE book_id = $${i}
    RETURNING *
    `,
    values
  );

  return rows[0] ? mapRow(rows[0]) : null;
}

/**
 * =========================================================
 * BULK UPDATE BOOKS
 * =========================================================
 * INPUT:
 *  - ids: number[]
 *  - items: array of objects (same length as ids)
 *
 * OUTPUT:
 *  - array of updated books
 */
async function updateBulk(ids, items, client = null) {
  if (!Array.isArray(ids) || !Array.isArray(items)) return [];
  if (!ids.length || !items.length) return [];
  if (ids.length !== items.length) {
    throw new Error('Bulk update mismatch');
  }

  const classId = [];
  const bookType = [];
  const bookAmount = [];
  const isConnected = [];

  for (const it of items) {
    if (!it?.classId) throw new Error('classId is required');
    if (!it?.bookType) throw new Error('bookType is required');

    classId.push(it.classId);
    bookType.push(it.bookType);
    bookAmount.push(it.bookAmount ?? 0);
    isConnected.push(it.isConnected ?? false);
  }

  const db = exec(client);

  const { rows } = await db.query(
    `
    UPDATE ${TABLE} b
    SET
      class_id = v.class_id,
      book_type = v.book_type,
      book_amount = v.book_amount,
      is_connected = v.is_connected
    FROM (
      SELECT * FROM UNNEST(
        $1::int[],
        $2::text[],
        $3::numeric[],
        $4::boolean[]
      ) AS t(
        id,
        class_id,
        book_type,
        book_amount,
        is_connected
      )
    ) v
    WHERE b.book_id = v.id
    RETURNING b.*
    `,
    [ids, classId, bookType, bookAmount, isConnected]
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
 * DELETE BOOK(S)
 * =========================================================
 */
async function remove(id, client = null) {
  const ids = Array.isArray(id) ? id : [id];
  if (!ids.length) return Array.isArray(id) ? [] : null;

  const db = exec(client);

  const { rows } = await db.query(
    `DELETE FROM ${TABLE} WHERE book_id = ANY($1::int[]) RETURNING *`,
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
 * TOGGLE IS_CONNECTED STATUS
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
    WHERE book_id = ANY($2::int[])
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

/**
 * =========================================================
 * CHECK CONNECTION STATUS
 * =========================================================
 * INPUT:
 *  - id: number | number[]
 *
 * OUTPUT:
 *  - single object OR array:
 *    { bookId, isConnected }
 */
async function checkIsConnected(id, client = null) {
  const ids = Array.isArray(id) ? id : [id];
  if (!ids.length) return Array.isArray(id) ? [] : null;

  const db = exec(client);

  const { rows } = await db.query(
    `
    SELECT book_id, is_connected
    FROM ${TABLE}
    WHERE book_id = ANY($1::int[])
    `,
    [ids]
  );

  const mapped = rows.map(r => ({
    bookId: r.book_id,
    isConnected: r.is_connected,
  }));

  return Array.isArray(id) ? mapped : mapped[0] || null;
}

module.exports = {
  create,
  findAll,
  findById,
  findByClassId,
  update,
  remove,
  updateIsConnected,
  checkIsConnected,
};