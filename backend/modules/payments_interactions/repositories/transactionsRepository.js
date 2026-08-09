// modules/payments_interactions/repositories/transactionsRepository.js
const db = require("../../../config/db.js");

// =========================================================
// 1. CREATE TRANSACTION
// INPUT (payload):
//   {
//     transaction_id: string|null,
//     payment_id: UUID (required),
//     payment_method: 'cash'|'card'|'online' (required),
//     amount_paid: number > 0 (required),
//     remarks: 'tuition'|'books'|'uniform' (required),
//     payment_date: timestamp|null (optional, defaults to now in DB)
//   }
// OUTPUT: the created transaction row (object)
//
// NOTE (ordering): transactions.payment_id has an FK to
// student_classes(payment_id) — the enrollment row — NOT to
// payments(payment_id). That means this insert only requires the
// enrollment to already exist; it does NOT require a payments
// summary row to exist yet.
//
// For TUITION remarks specifically: fn_handle_tuition computes
// total_amount_paid by SUMMING this table, so the usual call order
// for a new tuition payment is:
//   1) createTransactions({ ..., remarks: 'tuition' })
//   2) paymentsRepository.createPayments({ payment_id, class_id })
//      to recompute totals/pending/status from the ledger.
// Do both inside the same DB transaction (pass the same `client`)
// so a failure in step 2 rolls back step 1.
//
// For BOOKS/UNIFORM remarks: fn_handle_book_payment /
// fn_handle_uniform_payment maintain their own cumulative totals
// directly on bookspayments/uniformpayments — a transactions row
// with remarks 'books'/'uniform' is only an optional audit log here
// and isn't read back by those functions.
// =========================================================
const createTransactions = async (payload, client = null) => {
  const conn = client || db;
  const {
    transaction_id = null,
    payment_id,
    payment_method,
    amount_paid,
    remarks,
    payment_date = null,
  } = payload;

  if (!payment_id || !payment_method || amount_paid == null || !remarks) {
    throw new Error(
      "payment_id, payment_method, amount_paid and remarks are required."
    );
  }

  const result = await conn.query(
    `
    INSERT INTO transactions (
      transaction_id, payment_id, payment_method, amount_paid, remarks, payment_date
    )
    VALUES (
      $1, $2, $3, $4, $5, COALESCE($6, CURRENT_TIMESTAMP)
    )
    RETURNING *;
    `,
    [transaction_id, payment_id, payment_method, amount_paid, remarks, payment_date]
  );

  return result.rows[0];
};

// =========================================================
// 2. GET SINGLE TRANSACTION BY PK
// INPUT:
//   transaction_pk: UUID (required)
//   opts: { forUpdate?: boolean, client?: pg client }
//     forUpdate=true takes a row lock (SELECT ... FOR UPDATE) - use
//     this inside a transaction when you're about to modify the row.
// OUTPUT: transaction row (object) or null if not found
// =========================================================
const getTransactionByPk = async (transaction_pk, opts = {}) => {
  const { forUpdate = false, client = null } = opts;
  const conn = client || db;

  const lockClause = forUpdate ? "FOR UPDATE" : "";

  const result = await conn.query(
    `
    SELECT *
    FROM transactions
    WHERE transaction_pk = $1
    ${lockClause}
    `,
    [transaction_pk]
  );

  return result.rows[0] || null;
};

// =========================================================
// 3. GET MANY TRANSACTIONS (flexible filter)
// INPUT (filters):
//   {
//     payment_id?: UUID,
//     remarks?: 'tuition'|'books'|'uniform',
//     order?: 'ASC'|'DESC'          (default 'DESC', ordered by payment_date)
//     limit?: number|null           (null = no limit)
//     forUpdate?: boolean           (row-locks the returned set)
//   }
//   client: optional pg client (for use inside a transaction)
// OUTPUT: array of transaction rows
// =========================================================
const getTransactions = async (filters = {}, client = null) => {
  const conn = client || db;
  const {
    payment_id = null,
    remarks = null,
    order = "DESC",
    limit = null,
    forUpdate = false,
  } = filters;

  const conditions = [];
  const values = [];

  if (payment_id) {
    values.push(payment_id);
    conditions.push(`payment_id = $${values.length}`);
  }

  if (remarks) {
    values.push(remarks);
    conditions.push(`remarks = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderClause = `ORDER BY payment_date ${order === "ASC" ? "ASC" : "DESC"}`;
  const limitClause = limit ? `LIMIT ${Number(limit)}` : "";
  const lockClause = forUpdate ? "FOR UPDATE" : "";

  const result = await conn.query(
    `
    SELECT *
    FROM transactions
    ${whereClause}
    ${orderClause}
    ${limitClause}
    ${lockClause}
    `,
    values
  );

  return result.rows;
};

// =========================================================
// 4. UPDATE TRANSACTION (currently only amount_paid is mutated
//    by the reversal cascade, but kept generic for future fields)
//    NOTE: if remarks = 'tuition', the caller is responsible for
//    calling fn_handle_tuition/fn_reverse_tuition afterward to
//    keep payments.total_amount_paid/pending_amount in sync — this
//    function does not trigger a recompute itself.
// INPUT (payload):
//   { transaction_pk: UUID (required), amount_paid: number (required) }
// OUTPUT: updated transaction row (object)
// =========================================================
const updateTransactions = async (payload, client = null) => {
  const conn = client || db;
  const { transaction_pk, amount_paid } = payload;

  if (!transaction_pk || amount_paid == null) {
    throw new Error("transaction_pk and amount_paid are required.");
  }

  const result = await conn.query(
    `
    UPDATE transactions
    SET amount_paid = $2
    WHERE transaction_pk = $1
    RETURNING *;
    `,
    [transaction_pk, amount_paid]
  );

  if (result.rows.length === 0) {
    throw new Error(`Transaction ${transaction_pk} not found.`);
  }

  return result.rows[0];
};

// =========================================================
// 5. DELETE TRANSACTION BY PK
//    NOTE: same as updateTransactions — if this was a 'tuition'
//    row, call fn_handle_tuition/fn_reverse_tuition afterward to
//    recompute the payments summary.
// INPUT: transaction_pk: UUID (required)
// OUTPUT: deleted row (object) or null if nothing was deleted
// =========================================================
const deleteTransactionByPk = async (transaction_pk, client = null) => {
  const conn = client || db;

  const result = await conn.query(
    `
    DELETE FROM transactions
    WHERE transaction_pk = $1
    RETURNING *;
    `,
    [transaction_pk]
  );

  return result.rows[0] || null;
};

// =========================================================
// 6. DELETE ALL TRANSACTIONS FOR A PAYMENT_ID + REMARKS
//    Used for cleanup once every bookspayments/uniformpayments row
//    tied to that payment_id has been fully reversed away.
// INPUT:
//   payment_id: UUID (required)
//   remarks: 'tuition'|'books'|'uniform' (required)
// OUTPUT: array of deleted rows
// =========================================================
const deleteTransactionsByPaymentAndRemarks = async (
  payment_id,
  remarks,
  client = null
) => {
  const conn = client || db;

  if (!payment_id || !remarks) {
    throw new Error("payment_id and remarks are required.");
  }

  const result = await conn.query(
    `
    DELETE FROM transactions
    WHERE payment_id = $1
      AND remarks = $2
    RETURNING *;
    `,
    [payment_id, remarks]
  );

  return result.rows;
};

module.exports = {
  createTransactions,
  getTransactionByPk,
  getTransactions,
  updateTransactions,
  deleteTransactionByPk,
  deleteTransactionsByPaymentAndRemarks,
};