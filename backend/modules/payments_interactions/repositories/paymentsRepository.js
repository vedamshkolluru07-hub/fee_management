// modules/payments_interactions/repositories/paymentsRepository.js
const db = require("../../../config/db.js");

const withConnection = async (client) => {
  if (client) return { conn: client, owns: false };
  const conn = await db.connect();
  return { conn, owns: true };
};

// =========================================================
// 1. CREATE (single or batch) -> fn_handle_tuition
//    NOTE: fn_handle_tuition upserts the payments row itself and
//    now also validates that class_id matches the enrollment's
//    actual class (student_classes.class_id) — it will throw if
//    they don't match, so no need to double-check that here.
// =========================================================
const createPayments = async (payload, client = null) => {
  const { conn, owns } = await withConnection(client);

  try {
    if (owns) await conn.query("BEGIN");

    const items = Array.isArray(payload) ? payload : [payload];

    for (const item of items) {
      const { payment_id, class_id, concession = 0 } = item;

      if (!payment_id || !class_id) {
        throw new Error("payment_id and class_id are required.");
      }

      await conn.query(`SELECT fn_handle_tuition($1, $2, $3)`, [
        payment_id,
        class_id,
        concession,
      ]);
    }

    if (owns) await conn.query("COMMIT");
  } catch (err) {
    if (owns) await conn.query("ROLLBACK");
    throw err;
  } finally {
    if (owns) conn.release();
  }
};

// =========================================================
// 2. READ BY PAYMENT ID
// =========================================================
const getPaymentById = async (paymentId, client = null) => {
  const conn = client || db;

  const result = await conn.query(
    `SELECT * FROM payments WHERE payment_id = $1`,
    [paymentId]
  );

  return result.rows[0] || null;
};

// =========================================================
// 3. UPDATE (manual override of aggregate fields)
//    NOTE: fn_handle_tuition will recompute and overwrite
//    total_amount_paid/pending_amount/payment_status the next
//    time a tuition transaction is created or reversed for this
//    payment_id. Use this for one-off manual corrections only
//    (e.g. setting due_date, or a manual concession fix that
//    doesn't go through the transactions ledger).
// =========================================================
const updatePayments = async (payload, client = null) => {
  const { conn, owns } = await withConnection(client);

  try {
    if (owns) await conn.query("BEGIN");

    const items = Array.isArray(payload) ? payload : [payload];
    const results = [];

    for (const item of items) {
      const {
        payment_id,
        concession = 0,
        total_amount_paid,
        pending_amount,
        payment_status,
        due_date,
      } = item;

      if (!payment_id) {
        throw new Error("payment_id is required.");
      }

      const { rows } = await conn.query(
        `
        UPDATE payments
        SET
          concession = COALESCE($2, concession),
          total_amount_paid = COALESCE($3, total_amount_paid),
          pending_amount = COALESCE($4, pending_amount),
          payment_status = COALESCE($5, payment_status),
          due_date = COALESCE($6, due_date),
          updated_at = CURRENT_TIMESTAMP
        WHERE payment_id = $1
        RETURNING *;
        `,
        [
          payment_id,
          concession,
          total_amount_paid,
          pending_amount,
          payment_status,
          due_date,
        ]
      );

      if (rows.length === 0) {
        throw new Error(`Payment ${payment_id} not found.`);
      }

      results.push(rows[0]);
    }

    if (owns) await conn.query("COMMIT");

    return Array.isArray(payload) ? results : results[0];
  } catch (err) {
    if (owns) await conn.query("ROLLBACK");
    throw err;
  } finally {
    if (owns) conn.release();
  }
};

const updateConcessionByPaymentId = async (
  { payment_id, concession },
  client = null
) => {
  if (!payment_id) {
    throw new Error("payment_id is required.");
  }

  const conn = client || db;

  const result = await conn.query(
    `
    UPDATE payments
    SET
      concession = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE payment_id = $1
    RETURNING *;
    `,
    [payment_id, concession]
  );

  return result.rows[0] || null;
};

// =========================================================
// 4. REVERSE UPDATE -> fn_reverse_tuition
// =========================================================
const reversePayments = async (payload, client = null) => {
  const { conn, owns } = await withConnection(client);

  try {
    if (owns) await conn.query("BEGIN");

    const items = Array.isArray(payload) ? payload : [payload];

    for (const item of items) {
      const { payment_id, reversed_concession = 0 } = item;

      if (!payment_id) {
        throw new Error("payment_id is required.");
      }

      await conn.query(`SELECT fn_reverse_tuition($1, $2)`, [
        payment_id,
        reversed_concession,
      ]);
    }

    if (owns) await conn.query("COMMIT");
  } catch (err) {
    if (owns) await conn.query("ROLLBACK");
    throw err;
  } finally {
    if (owns) conn.release();
  }
};

// =========================================================
// 5. DELETE BY PAYMENT ID
//    ⚠️ DESTRUCTIVE: payments.payment_id is referenced by
//    transactions, bookspayments and uniformpayments via
//    ON DELETE CASCADE. Deleting a payments row now also wipes
//    every tuition transaction and every book/uniform payment
//    row tied to this payment_id. It does NOT delete the
//    student_classes (enrollment) row itself.
//    Only call this for a genuine full rollback of an
//    enrollment's entire financial history — not for routine
//    corrections (use reversePayments / reverseBookPayments /
//    reverseUniformPayments instead).
// =========================================================
const deletePayment = async (paymentId, client = null) => {
  const conn = client || db;

  const result = await conn.query(
    `DELETE FROM payments WHERE payment_id = $1 RETURNING *;`,
    [paymentId]
  );

  return result.rows[0] || null;
};

// =========================================================
// EXPORTS
// =========================================================
module.exports = {
  createPayments,
  getPaymentById,
  updatePayments,
  updateConcessionByPaymentId,
  reversePayments,
  deletePayment,
};