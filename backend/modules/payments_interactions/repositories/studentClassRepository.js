// student_classesRepository.js
const pool = require('../../../config/db.js');

// ================= HELPERS =================
function isArray(data) {
  return Array.isArray(data);
}

function normalizeItem(item = {}) {
  return {
    student_id: item.student_id,
    class_id: item.class_id,
    academic_year_id: item.academic_year_id,
    is_connected: Boolean(item.is_connected ?? false),
  };
}

async function runTransaction(db, callback) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ================= CREATE =================
// NOTE: student_classes has UNIQUE(student_id, class_id, academic_year_id).
// A duplicate enrollment attempt raises Postgres error code 23505; we
// translate that into a clearer message here rather than leaking the
// raw driver error up to callers.
async function create(data, db = pool) {
  const items = isArray(data) ? data : [data];
  if (!items.length) return [];

  const values = [];
  const placeholders = [];

  items.forEach((item, i) => {
    const d = normalizeItem(item);
    const base = i * 4;
    placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
    values.push(d.student_id, d.class_id, d.academic_year_id, d.is_connected);
  });

  try {
    const { rows } = await db.query(
      `INSERT INTO student_classes (student_id, class_id, academic_year_id, is_connected)
       VALUES ${placeholders.join(", ")}
       RETURNING student_id, class_id, academic_year_id, payment_id, is_connected;`,
      values
    );

    return rows;
  } catch (err) {
    if (err.code === "23505") {
      throw new Error(
        "One or more of these students is already enrolled in that class for that academic year."
      );
    }
    throw err;
  }
}

// ================= READ =================
async function getByStudentId(studentIds, db = pool) {
  const ids = isArray(studentIds) ? studentIds : [studentIds];
  if (!ids.length) return [];

  const { rows } = await db.query(
    `SELECT student_id, class_id, academic_year_id, payment_id, is_connected
     FROM student_classes
     WHERE student_id = ANY($1);`,
    [ids]
  );
  return rows;
}

async function getByAcademicYearId(yearIds, db = pool) {
  const ids = isArray(yearIds) ? yearIds : [yearIds];
  if (!ids.length) return [];

  const { rows } = await db.query(
    `SELECT student_id, class_id, academic_year_id, payment_id, is_connected
     FROM student_classes
     WHERE academic_year_id = ANY($1);`,
    [ids]
  );
  return rows;
}

async function getByYearAndClass(yearId, classId, db = pool) {
  const { rows } = await db.query(
    `SELECT student_id, class_id, academic_year_id, payment_id, is_connected
     FROM student_classes
     WHERE academic_year_id = $1 AND class_id = $2;`,
    [yearId, classId]
  );
  return rows;
}

async function getPaymentId(yearId, classId, studentId, db = pool) {
  const { rows } = await db.query(
    `SELECT student_id, class_id, academic_year_id, payment_id, is_connected
     FROM student_classes
     WHERE academic_year_id = $1 AND class_id = $2 AND student_id = $3;`,
    [yearId, classId, studentId]
  );
  return rows[0] ?? null;
}

// ================= UPDATE =================
async function updateIsConnectedByPaymentId(paymentIds, isConnected, db = pool) {
  const ids = isArray(paymentIds) ? paymentIds : [paymentIds];
  if (!ids.length) return [];

  const { rows } = await db.query(
    `UPDATE student_classes
     SET is_connected = $1
     WHERE payment_id = ANY($2)
     RETURNING student_id, class_id, academic_year_id, payment_id, is_connected;`,
    [isConnected, ids]
  );
  return rows;
}

async function updateIsConnectedByComposite(data, isConnected, db = pool) {
  const items = isArray(data) ? data : [data];
  if (!items.length) return [];

  return runTransaction(db, async (client) => {
    const results = [];
    for (const item of items) {
      const { student_id, class_id, academic_year_id } = normalizeItem(item);
      const { rows } = await client.query(
        `UPDATE student_classes
         SET is_connected = $1
         WHERE student_id = $2 AND class_id = $3 AND academic_year_id = $4
         RETURNING student_id, class_id, academic_year_id, payment_id, is_connected;`,
        [isConnected, student_id, class_id, academic_year_id]
      );
      if (rows[0]) results.push(rows[0]);
    }
    return results;
  });
}

async function updateIsConnectedByYear(yearIds, isConnected, db = pool) {
  const ids = isArray(yearIds) ? yearIds : [yearIds];
  if (!ids.length) return [];

  const { rows } = await db.query(
    `UPDATE student_classes
     SET is_connected = $1
     WHERE academic_year_id = ANY($2)
     RETURNING student_id, class_id, academic_year_id, payment_id, is_connected;`,
    [isConnected, ids]
  );
  return rows;
}

// ================= DELETE =================
// NOTE: student_classes.payment_id is now the FK target for payments,
// transactions, bookspayments and uniformpayments (all ON DELETE
// CASCADE). Deleting a row here wipes that enrollment's entire
// financial history — tuition summary, every transaction, every
// book/uniform payment. Make sure that's really intended before
// calling these.
async function deleteByAcademicYear(yearIds, db = pool) {
  const ids = isArray(yearIds) ? yearIds : [yearIds];
  if (!ids.length) return [];

  const { rows } = await db.query(
    `DELETE FROM student_classes
     WHERE academic_year_id = ANY($1)
     RETURNING student_id, class_id, academic_year_id, payment_id;`,
    [ids]
  );
  return rows;
}

async function deleteByYearAndClass(yearId, classId, db = pool) {
  const { rows } = await db.query(
    `DELETE FROM student_classes
     WHERE academic_year_id = $1 AND class_id = $2
     RETURNING student_id, class_id, academic_year_id, payment_id;`,
    [yearId, classId]
  );
  return rows;
}

async function deleteByYearClassStudent(data, db = pool) {
  const items = isArray(data) ? data : [data];
  if (!items.length) return [];

  return runTransaction(db, async (client) => {
    const results = [];
    for (const item of items) {
      const { student_id, class_id, academic_year_id } = normalizeItem(item);
      const { rows } = await client.query(
        `DELETE FROM student_classes
         WHERE student_id = $1 AND class_id = $2 AND academic_year_id = $3
         RETURNING student_id, class_id, academic_year_id, payment_id;`,
        [student_id, class_id, academic_year_id]
      );
      if (rows[0]) results.push(rows[0]);
    }
    return results;
  });
}

// ================= EXPORTS =================
module.exports = {
  isArray,
  normalizeItem,
  runTransaction,
  create,
  getByStudentId,
  getByAcademicYearId,
  getByYearAndClass,
  getPaymentId,
  updateIsConnectedByPaymentId,
  updateIsConnectedByComposite,
  updateIsConnectedByYear,
  deleteByAcademicYear,
  deleteByYearAndClass,
  deleteByYearClassStudent,
};