// modules/payments_interactions/services/tuitionTransactionsService.js
//
// NOTE: fn_handle_tuition previously had a missing "INTO v_fee" clause
// (already patched in the SQL migration you have). This service assumes
// that patch is applied so pending_amount/payment_status compute correctly.
//
// NOTE (transaction sharing): both functions now accept an optional
// external `client` as their 2nd argument, using the same withConnection
// pattern already used in the repositories. When called standalone
// (no client passed), each function opens its own connection and owns
// BEGIN/COMMIT/ROLLBACK/release, exactly as before. When called with a
// client that belongs to an outer transaction (e.g. from
// createStudentEnrollment), it only runs its queries against that
// client and lets the CALLER commit/rollback/release — so the tuition
// payment becomes part of the same atomic transaction as the
// enrollment, instead of a second, independent one.
//
// NOTE (audit logging): audit logs are only written when this
// function OWNS the transaction (i.e. no externalClient was passed).
// When called from within createStudentEnrollment, the enrollment
// service already writes a single CREATE_STUDENT_ENROLLMENT audit
// entry covering the whole flow — logging here too would double it up.

const db = require("../../../config/db.js");
const transactionsRepository = require("../repositories/transactionsRepository.js");
const paymentsRepository = require("../repositories/paymentsRepository.js");
const studentClassRepository = require("../repositories/studentClassRepository.js");
const {
  createAuditLogService
} = require("../../user_management/services/auditLogServiceCreate.js");
const VALID_PAYMENT_METHODS = ["cash", "card", "online"];

const withConnection = async (client) => {
  if (client) return { conn: client, owns: false };
  const conn = await db.connect();
  return { conn, owns: true };
};

// =========================================================
// 1. CREATE -> resolve payment_id via studentClassRepository.getPaymentId
//              + transactionsRepository.createTransactions (remarks='tuition')
//              + paymentsRepository.createPayments (fn_handle_tuition)
//              + optional due_date set via paymentsRepository.updatePayments
//
// INPUT (payload):
//   {
//     student_id, class_id, academic_year_id  (required — used to
//       resolve the enrollment's payment_id)
//     payment_method: 'cash'|'card'|'online'  (required)
//     amount_paid: number > 0                 (required)
//     transaction_id?: string
//     payment_date?: Date
//     concession?: number (default 0)
//     due_date?: string|Date|null             (optional — set on the
//       payments row if provided; NOT part of fn_handle_tuition itself)
//   }
//   externalClient: optional pg client belonging to an outer
//     transaction (e.g. student enrollment). If omitted, this
//     function manages its own BEGIN/COMMIT/ROLLBACK.
//   actor: optional { user_id, ... } for audit logging (only used
//     when this call owns the transaction — see NOTE above).
// =========================================================
const createTuitionTransaction = async (payload, externalClient = null, actor = null) => {
  const { conn: client, owns } = await withConnection(externalClient);

  try {
    const {
      student_id,
      class_id,
      academic_year_id,
      payment_method,
      amount_paid,
      transaction_id = null,
      payment_date = null,
      concession = 0,
      due_date = null,
    } = payload;

    if (
      !student_id ||
      !class_id ||
      !academic_year_id ||
      !payment_method ||
      amount_paid == null
    ) {
      throw new Error(
        "student_id, class_id, academic_year_id, payment_method and amount_paid are required."
      );
    }
    if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
      throw new Error(
        `payment_method must be one of: ${VALID_PAYMENT_METHODS.join(", ")}`
      );
    }
    if (Number(amount_paid) <= 0) {
      throw new Error("amount_paid must be greater than 0.");
    }
    if (Number(concession) < 0) {
      throw new Error("concession cannot be negative.");
    }

    if (owns) await client.query("BEGIN");

    const enrollment = await studentClassRepository.getPaymentId(
      academic_year_id,
      class_id,
      student_id,
      client
    );

    if (!enrollment) {
      throw new Error(
        `No enrollment found for student ${student_id} in class ${class_id}, academic year ${academic_year_id}.`
      );
    }

    const { payment_id } = enrollment;

    // transactions table is the source of truth ledger
    const transaction = await transactionsRepository.createTransactions(
      {
        transaction_id,
        payment_id,
        payment_method,
        amount_paid,
        remarks: "tuition",
        payment_date,
      },
      client
    );

    // recalculate/upsert the payments aggregate row from transactions + concession
    await paymentsRepository.createPayments(
      { payment_id, class_id, concession },
      client
    );

    // due_date isn't part of fn_handle_tuition's recalculation — set it
    // explicitly if the caller provided one (e.g. at enrollment time).
    if (due_date) {
      await paymentsRepository.updatePayments({ payment_id, due_date }, client);
    }

    const payment = await paymentsRepository.getPaymentById(
      payment_id,
      client
    );

    if (owns) {
      await client.query("COMMIT");

      await createAuditLogService({
        actor_user_id: actor?.user_id || null,
        action: "CREATE_TUITION_TRANSACTION",
        category: "create",
        log_message: `Tuition payment of ${amount_paid} recorded for payment_id ${payment_id} (student ${student_id})`,
        target_entity_type: "payment",
        changes: { payment_id, student_id, class_id, academic_year_id, amount_paid, concession, payment_method },
        success: true
      });
    }

    return { transaction, payment };
  } catch (error) {
    if (owns) {
      await client.query("ROLLBACK");

      await createAuditLogService({
        actor_user_id: actor?.user_id || null,
        action: "CREATE_TUITION_TRANSACTION",
        category: "create",
        log_message: `Failed to record tuition transaction: ${error.message}`,
        target_entity_type: "payment",
        changes: { payload },
        success: false,
        severity: "warning"
      });
    }
    throw error;
  } finally {
    if (owns) client.release();
  }
};

// =========================================================
// 2. REVERSE
//    - Look up the transaction by transaction_pk (row-locked, since
//      we're about to delete it) to get its payment_id and confirm
//      it's actually a 'tuition' transaction.
//    - Delete it via transactionsRepository.deleteTransactionByPk
//      (that repo function only takes transaction_pk — it has no
//      remarks filter and doesn't return payment_id on its own, so
//      we must resolve payment_id beforehand).
//    - Recalculate the payments aggregate via fn_reverse_tuition.
//
//    Accepts an optional externalClient for the same reason as
//    createTuitionTransaction above.
// =========================================================
const reverseTuitionTransaction = async (payload, externalClient = null, actor = null) => {
  const { conn: client, owns } = await withConnection(externalClient);

  try {
    const { transaction_pk, reversed_concession = 0 } = payload;

    if (!transaction_pk) {
      throw new Error("transaction_pk is required.");
    }
    if (Number(reversed_concession) < 0) {
      throw new Error("reversed_concession cannot be negative.");
    }

    if (owns) await client.query("BEGIN");

    // Row-lock the transaction first so we can safely read + delete it
    const existingTransaction = await transactionsRepository.getTransactionByPk(
      transaction_pk,
      { forUpdate: true, client }
    );

    if (!existingTransaction) {
      throw new Error(`Transaction ${transaction_pk} not found.`);
    }
    if (existingTransaction.remarks !== "tuition") {
      throw new Error(
        `Transaction ${transaction_pk} is not a tuition transaction.`
      );
    }

    const { payment_id } = existingTransaction;

    const deletedTransaction = await transactionsRepository.deleteTransactionByPk(
      transaction_pk,
      client
    );

    if (!deletedTransaction) {
      throw new Error(`Transaction ${transaction_pk} could not be deleted.`);
    }

    await paymentsRepository.reversePayments(
      { payment_id, reversed_concession },
      client
    );

    const payment = await paymentsRepository.getPaymentById(
      payment_id,
      client
    );

    if (owns) {
      await client.query("COMMIT");

      await createAuditLogService({
        actor_user_id: actor?.user_id || null,
        action: "REVERSE_TUITION_TRANSACTION",
        category: "delete",
        log_message: `Tuition transaction ${transaction_pk} reversed for payment_id ${payment_id}`,
        target_entity_type: "payment",
        changes: { transaction_pk, payment_id, reversed_concession },
        success: true,
        severity: "warning"
      });
    }

    return {
      deleted_transaction: deletedTransaction,
      payment: payment || null,
    };
  } catch (error) {
    if (owns) {
      await client.query("ROLLBACK");

      await createAuditLogService({
        actor_user_id: actor?.user_id || null,
        action: "REVERSE_TUITION_TRANSACTION",
        category: "delete",
        log_message: `Failed to reverse tuition transaction: ${error.message}`,
        target_entity_type: "payment",
        changes: { payload },
        success: false,
        severity: "warning"
      });
    }
    throw error;
  } finally {
    if (owns) client.release();
  }
};

// =========================================================
// 3. READ -> payment row + its tuition transactions
//    Read-only, so no transaction/client sharing needed here.
// =========================================================
const getPaymentWithTuitionTransactions = async (payment_id) => {
  const payment = await paymentsRepository.getPaymentById(payment_id);

  if (!payment) {
    return null;
  }

  const transactions = await transactionsRepository.getTransactions({
    payment_id,
    remarks: "tuition",
    limit: null,
  });

  return { ...payment, transactions };
};

module.exports = {
  createTuitionTransaction,
  reverseTuitionTransaction,
  getPaymentWithTuitionTransactions,
};