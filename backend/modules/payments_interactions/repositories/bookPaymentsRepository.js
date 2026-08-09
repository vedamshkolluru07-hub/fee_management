// modules/payments_interactions/repositories/bookPaymentsRepository.js
const db = require("../../../config/db.js");

const withConnection = async (client) => {
  if (client) return { conn: client, owns: false };
  const conn = await db.connect();
  return { conn, owns: true };
};

// =========================================================
// 1. CREATE / TOP-UP BOOK PAYMENT(S)  -> fn_handle_book_payment
// INPUT (payload — single object or array of objects):
//   {
//     payment_id: UUID (required),
//     book_id: INT (required),
//     books_paid: number (default 0),
//     books_discount: number (default 0),
//     received: boolean (default false)
//   }
// OUTPUT: void (rows are upserted inside bookspayments;
//          caller re-reads via getBookPaymentsByPaymentId if needed)
//
// NOTE: fn_handle_book_payment upserts a payments row for
// payment_id itself before writing bookspayments, and
// bookspayments.payment_id's FK points at student_classes(payment_id)
// (the enrollment), so this call only requires the enrollment to
// already exist — no need to call paymentsRepository.createPayments
// first.
// =========================================================
const createBookPayments = async (payload, client = null) => {
  const { conn, owns } = await withConnection(client);
  try {
    if (owns) await conn.query("BEGIN");
    const items = Array.isArray(payload) ? payload : [payload];

    for (const item of items) {
      const {
        payment_id,
        book_id,
        books_paid = 0,
        books_discount = 0,
        received = false,
      } = item;

      if (!payment_id || book_id == null) {
        throw new Error("payment_id and book_id are required.");
      }

      await conn.query(`SELECT fn_handle_book_payment($1, $2, $3, $4, $5)`, [
        payment_id,
        book_id,
        books_paid,
        books_discount,
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
// 2. READ ALL BOOK PAYMENT ROWS FOR A PAYMENT ID
// INPUT: paymentId: UUID (required)
// OUTPUT: array of bookspayments rows (all columns), ordered by
//         created_at ASC
// =========================================================
const getBookPaymentsByPaymentId = async (paymentId, client = null) => {
  const conn = client || db;
  const result = await conn.query(
    `
    SELECT *
    FROM bookspayments
    WHERE payment_id = $1
    ORDER BY created_at ASC
    `,
    [paymentId]
  );
  return result.rows;
};

// =========================================================
// 2b. READ A SINGLE BOOK PAYMENT ROW (payment_id + book_id)
//     Used by the reversal flow to validate bounds before
//     calling fn_reverse_book_payment (0 <= amount <= currently paid).
// INPUT: paymentId: UUID, bookId: INT
// OUTPUT: single bookspayments row (object) or null if not found
// =========================================================
const getBookPaymentByPaymentIdAndBookId = async (
  paymentId,
  bookId,
  client = null
) => {
  const conn = client || db;
  const result = await conn.query(
    `
    SELECT *
    FROM bookspayments
    WHERE payment_id = $1
      AND book_id = $2
    `,
    [paymentId, bookId]
  );
  return result.rows[0] || null;
};

// =========================================================
// 3. REVERSE BOOK PAYMENT(S)  -> fn_reverse_book_payment
//    NOTE: received/received_at are never modified here, and the
//    underlying SQL function auto-deletes the row once books_paid
//    reaches 0 — no separate delete call is needed from the app.
// INPUT (payload — single object or array of objects):
//   {
//     payment_id: UUID (required),
//     book_id: INT (required),
//     books_paid: number (default 0)      - amount to remove
//     books_discount: number (default 0)  - discount to remove
//   }
// OUTPUT: void
// =========================================================
const reverseBookPayments = async (payload, client = null) => {
  const { conn, owns } = await withConnection(client);
  try {
    if (owns) await conn.query("BEGIN");
    const items = Array.isArray(payload) ? payload : [payload];

    for (const item of items) {
      const { payment_id, book_id, books_paid = 0, books_discount = 0 } = item;

      if (!payment_id || book_id == null) {
        throw new Error("payment_id and book_id are required.");
      }

      await conn.query(`SELECT fn_reverse_book_payment($1, $2, $3, $4)`, [
        payment_id,
        book_id,
        books_paid,
        books_discount,
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
// 4. MARK BOOK RECEIVED / UN-RECEIVED -> fn_mark_book_received
//    Dedicated, independent of payment/reversal actions.
// INPUT:
//   { payment_id: UUID (required), book_id: INT (required),
//     received: boolean (required) }
// OUTPUT: void
// =========================================================
const markBookReceived = async (payload, client = null) => {
  const conn = client || db;
  const { payment_id, book_id, received } = payload;

  if (!payment_id || book_id == null || typeof received !== "boolean") {
    throw new Error("payment_id, book_id and received (boolean) are required.");
  }

  await conn.query(`SELECT fn_mark_book_received($1, $2, $3)`, [
    payment_id,
    book_id,
    received,
  ]);
};

module.exports = {
  createBookPayments,
  getBookPaymentsByPaymentId,
  getBookPaymentByPaymentIdAndBookId,
  reverseBookPayments,
  markBookReceived,
};