// modules/payments_interactions/repositories/uniformPaymentsRepository.js
const db = require("../../../config/db.js");

const withConnection = async (client) => {
  if (client) return { conn: client, owns: false };
  const conn = await db.connect();
  return { conn, owns: true };
};

// =========================================================
// 1. CREATE / TOP-UP UNIFORM PAYMENT(S)  -> fn_handle_uniform_payment
// INPUT (payload — single object or array of objects):
//   {
//     payment_id: UUID (required),
//     uniform_id: INT (required),
//     uniform_paid: number (default 0),
//     uniform_discount: number (default 0),
//     received: boolean (default false)
//   }
// OUTPUT: void (rows are upserted inside uniformpayments;
//          caller re-reads via getUniformPaymentsByPaymentId if needed)
//
// NOTE: fn_handle_uniform_payment upserts a payments row for
// payment_id itself before writing uniformpayments, and
// uniformpayments.payment_id's FK points at student_classes(payment_id)
// (the enrollment), so this call only requires the enrollment to
// already exist — no need to call paymentsRepository.createPayments
// first.
// =========================================================
const createUniformPayments = async (payload, client = null) => {
  const { conn, owns } = await withConnection(client);
  try {
    if (owns) await conn.query("BEGIN");
    const items = Array.isArray(payload) ? payload : [payload];

    for (const item of items) {
      const {
        payment_id,
        uniform_id,
        uniform_paid = 0,
        uniform_discount = 0,
        received = false,
      } = item;

      if (!payment_id || uniform_id == null) {
        throw new Error("payment_id and uniform_id are required.");
      }

      await conn.query(`SELECT fn_handle_uniform_payment($1, $2, $3, $4, $5)`, [
        payment_id,
        uniform_id,
        uniform_paid,
        uniform_discount,
        received,
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
// 2. READ ALL UNIFORM PAYMENT ROWS FOR A PAYMENT ID
// INPUT: paymentId: UUID (required)
// OUTPUT: array of uniformpayments rows (all columns), ordered by
//         created_at ASC
// =========================================================
const getUniformPaymentsByPaymentId = async (paymentId, client = null) => {
  const conn = client || db;
  const result = await conn.query(
    `
    SELECT *
    FROM uniformpayments
    WHERE payment_id = $1
    ORDER BY created_at ASC
    `,
    [paymentId]
  );
  return result.rows;
};

// =========================================================
// 2b. READ A SINGLE UNIFORM PAYMENT ROW (payment_id + uniform_id)
//     Used by the reversal flow to validate bounds before
//     calling fn_reverse_uniform_payment (0 <= amount <= currently paid).
// INPUT: paymentId: UUID, uniformId: INT
// OUTPUT: single uniformpayments row (object) or null if not found
// =========================================================
const getUniformPaymentByPaymentIdAndUniformId = async (
  paymentId,
  uniformId,
  client = null
) => {
  const conn = client || db;
  const result = await conn.query(
    `
    SELECT *
    FROM uniformpayments
    WHERE payment_id = $1
      AND uniform_id = $2
    `,
    [paymentId, uniformId]
  );
  return result.rows[0] || null;
};

// =========================================================
// 3. REVERSE UNIFORM PAYMENT(S)  -> fn_reverse_uniform_payment
//    NOTE: received/received_at are never modified here, and the
//    underlying SQL function auto-deletes the row once uniform_paid
//    reaches 0 — no separate delete call is needed from the app.
// INPUT (payload — single object or array of objects):
//   {
//     payment_id: UUID (required),
//     uniform_id: INT (required),
//     uniform_paid: number (default 0)      - amount to remove
//     uniform_discount: number (default 0)  - discount to remove
//   }
// OUTPUT: void
// =========================================================
const reverseUniformPayments = async (payload, client = null) => {
  const { conn, owns } = await withConnection(client);
  try {
    if (owns) await conn.query("BEGIN");
    const items = Array.isArray(payload) ? payload : [payload];

    for (const item of items) {
      const {
        payment_id,
        uniform_id,
        uniform_paid = 0,
        uniform_discount = 0,
      } = item;

      if (!payment_id || uniform_id == null) {
        throw new Error("payment_id and uniform_id are required.");
      }

      await conn.query(`SELECT fn_reverse_uniform_payment($1, $2, $3, $4)`, [
        payment_id,
        uniform_id,
        uniform_paid,
        uniform_discount,
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
// 4. MARK UNIFORM RECEIVED / UN-RECEIVED -> fn_mark_uniform_received
//    Dedicated, independent of payment/reversal actions.
// INPUT:
//   { payment_id: UUID (required), uniform_id: INT (required),
//     received: boolean (required) }
// OUTPUT: void
// =========================================================
const markUniformReceived = async (payload, client = null) => {
  const conn = client || db;
  const { payment_id, uniform_id, received } = payload;

  if (!payment_id || uniform_id == null || typeof received !== "boolean") {
    throw new Error(
      "payment_id, uniform_id and received (boolean) are required."
    );
  }

  await conn.query(`SELECT fn_mark_uniform_received($1, $2, $3)`, [
    payment_id,
    uniform_id,
    received,
  ]);
};

module.exports = {
  createUniformPayments,
  getUniformPaymentsByPaymentId,
  getUniformPaymentByPaymentIdAndUniformId,
  reverseUniformPayments,
  markUniformReceived,
};