// modules/payments_interactions/services/transactionUniformService.js
const db = require("../../../config/db.js");
const transactionsRepository = require("../repositories/transactionsRepository.js");
const uniformPaymentsRepository = require("../repositories/uniformPaymentsRepository.js");
// ASSUMPTION: confirm this path is correct for your project layout
const studentClassRepository = require("../repositories/studentClassRepository.js");
const {
  createAuditLogService
} = require("../../user_management/services/auditLogServiceCreate.js");

const VALID_PAYMENT_METHODS = ["cash", "card", "online"];

// Floor kept in application code only (NOT a DB constraint), per design
// decision: a 'uniform' transaction is never reversed below this amount —
// any leftover reversal carries over to the next older 'uniform' transaction.
const RESERVE_FLOOR = 100;

// =========================================================
// 1. CREATE -> resolve payment_id via studentClassRepository.getPaymentId
//              + transactionsRepository.createTransactions
//              + uniformPaymentsRepository.createUniformPayments per item
//    All run against the SAME client so the whole operation is atomic.
//
// INPUT (payload):
//   {
//     student_id, class_id, academic_year_id: identify the enrollment
//     payment_method: 'cash'|'card'|'online'
//     transaction_id: string|null (optional external reference)
//     payment_date: timestamp|null (optional)
//     uniforms: [
//       { uniform_id, uniform_paid, uniform_discount, received }, ...
//     ]
//   }
//   NOTE: amount_paid on the transaction row = SUM of uniforms[].uniform_paid
//
// OUTPUT: { ...transaction row, uniforms: [ ...uniformpayments rows ] }
// =========================================================
const createTransactionWithUniforms = async (payload, actor = null) => {
  const client = await db.connect();
  try {
    const {
      student_id,
      class_id,
      academic_year_id,
      payment_method,
      transaction_id = null,
      payment_date = null,
      uniforms,
    } = payload;

    if (!student_id || !class_id || !academic_year_id || !payment_method) {
      throw new Error(
        "student_id, class_id, academic_year_id and payment_method are required."
      );
    }
    if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
      throw new Error(
        `payment_method must be one of: ${VALID_PAYMENT_METHODS.join(", ")}`
      );
    }
    if (!Array.isArray(uniforms) || uniforms.length === 0) {
      throw new Error("uniforms must be a non-empty array.");
    }
    for (const u of uniforms) {
      if (u.uniform_id == null) {
        throw new Error("Each uniform entry requires a uniform_id.");
      }
    }

    const totalPaid = uniforms.reduce(
      (sum, u) => sum + Number(u.uniform_paid || 0),
      0
    );
    if (totalPaid <= 0) {
      throw new Error(
        "Total uniform_paid across all uniforms must be greater than 0."
      );
    }

    await client.query("BEGIN");

    // resolve the enrollment's payment_id (student_classes is the
    // source of truth for which UUID this student/class/year maps to)
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

    const transaction = await transactionsRepository.createTransactions(
      {
        transaction_id,
        payment_id,
        payment_method,
        amount_paid: totalPaid,
        remarks: "uniform",
        payment_date,
      },
      client
    );

    const uniformItems = uniforms.map((u) => ({
      payment_id,
      uniform_id: u.uniform_id,
      uniform_paid: u.uniform_paid || 0,
      uniform_discount: u.uniform_discount || 0,
      received: u.received || false,
    }));

    await uniformPaymentsRepository.createUniformPayments(uniformItems, client);

    await client.query("COMMIT");

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "CREATE_UNIFORMS_TRANSACTION",
      category: "create",
      log_message: `Uniforms payment of ${totalPaid} recorded for payment_id ${payment_id} (student ${student_id})`,
      target_entity_type: "payment",
      changes: { payment_id, student_id, class_id, academic_year_id, totalPaid, uniforms: uniformItems },
      success: true
    });

    return getTransactionWithUniforms(transaction.transaction_pk);
  } catch (error) {
    await client.query("ROLLBACK");

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "CREATE_UNIFORMS_TRANSACTION",
      category: "create",
      log_message: `Failed to record uniforms transaction: ${error.message}`,
      target_entity_type: "payment",
      changes: { payload },
      success: false,
      severity: "warning"
    });

    throw error;
  } finally {
    client.release();
  }
};

// =========================================================
// 2. READ -> single transaction row + ALL uniformpayments rows for
//    that transaction's payment_id (uniformpayments is cumulative per
//    payment_id+uniform_id, it is NOT scoped to one single transaction).
//
// INPUT: transaction_pk: UUID
// OUTPUT: { ...transaction row, uniforms: [...] } or null if not found
// =========================================================
const getTransactionWithUniforms = async (transaction_pk) => {
  const transaction = await transactionsRepository.getTransactionByPk(
    transaction_pk
  );
  if (!transaction) {
    return null;
  }
  const uniforms = await uniformPaymentsRepository.getUniformPaymentsByPaymentId(
    transaction.payment_id
  );
  return { ...transaction, uniforms };
};

// =========================================================
// 3. READ MANY -> all 'uniform' transactions + the (shared) uniform
//    rows for a given payment_id.
//
// INPUT: payment_id: UUID
// OUTPUT: {
//   transactions: [ ...transaction rows, newest first ],
//   uniforms: [ ...uniformpayments rows ]
// }
// =========================================================
const getTransactionsWithUniformsByPaymentId = async (payment_id) => {
  const transactions = await transactionsRepository.getTransactions({
    payment_id,
    remarks: "uniform",
    order: "DESC",
  });
  const uniforms = await uniformPaymentsRepository.getUniformPaymentsByPaymentId(
    payment_id
  );
  return { transactions, uniforms };
};

// =========================================================
// INTERNAL HELPER: cascade a total reversal amount across the
// payment_id's 'uniform' transactions, newest -> oldest, never taking
// any single transaction below RESERVE_FLOOR. Leftover carries to
// the next older transaction. Transactions are only ever UPDATED
// here, never deleted (deletion of leftover rows, if applicable,
// happens separately once all uniform rows are gone - see step 4).
//
// INPUT:
//   payment_id: UUID
//   totalReverseAmount: number > 0
//   client: pg client (must be inside an open transaction)
// OUTPUT: number - amount that could NOT be absorbed (should be 0
//         under normal operation; left as a safety signal otherwise)
// =========================================================
const cascadeReverseTransactionAmount = async (
  payment_id,
  totalReverseAmount,
  client
) => {
  let remaining = Number(totalReverseAmount);
  if (remaining <= 0) return 0;

  // newest first, row-locked so concurrent reversals can't double-deduct
  const txns = await transactionsRepository.getTransactions(
    { payment_id, remarks: "uniform", order: "DESC", forUpdate: true },
    client
  );

  for (const txn of txns) {
    if (remaining <= 0) break;

    const currentAmount = Number(txn.amount_paid);
    const deductible = currentAmount - RESERVE_FLOOR;

    if (deductible <= 0) {
      // already at (or below) the floor, nothing more to take here
      continue;
    }

    if (remaining <= deductible) {
      const newAmount = currentAmount - remaining;
      await transactionsRepository.updateTransactions(
        { transaction_pk: txn.transaction_pk, amount_paid: newAmount },
        client
      );
      remaining = 0;
    } else {
      await transactionsRepository.updateTransactions(
        { transaction_pk: txn.transaction_pk, amount_paid: RESERVE_FLOOR },
        client
      );
      remaining -= deductible;
    }
  }

  return remaining;
};

// =========================================================
// 4. REVERSE -> validates each uniform's reversal amount against what's
//    currently paid, reverses each uniform row (auto-deletes the row if
//    it hits 0), cascades the total amount across 'uniform' transactions
//    (floored, never deleted here), then cleans up any leftover
//    'uniform' transactions if NO uniform rows remain for the payment_id.
//
// INPUT (payload):
//   {
//     payment_id: UUID (required),
//     uniforms: [
//       { uniform_id, uniform_paid, uniform_discount? }, ...
//     ]
//   }
//   NOTE: uniform_discount is optional per entry.
//
// OUTPUT: {
//   transactions: [ ...remaining 'uniform' transaction rows ],
//   uniforms: [ ...remaining uniformpayments rows ]
// }
// =========================================================
const reverseTransactionUniformPayments = async (payload, actor = null) => {
  const client = await db.connect();
  try {
    const { payment_id, uniforms } = payload;

    if (!payment_id) {
      throw new Error("payment_id is required.");
    }
    if (!Array.isArray(uniforms) || uniforms.length === 0) {
      throw new Error("uniforms must be a non-empty array.");
    }

    await client.query("BEGIN");

    let totalReverseAmount = 0;

    for (const u of uniforms) {
      const { uniform_id, uniform_paid = 0, uniform_discount = 0 } = u;

      if (uniform_id == null) {
        throw new Error("Each uniform entry requires a uniform_id.");
      }
      if (uniform_paid < 0 || uniform_discount < 0) {
        throw new Error("Reversal amounts cannot be negative.");
      }

      // Validate bounds: reversal must be within 0..currently_paid
      const currentRow = await uniformPaymentsRepository.getUniformPaymentByPaymentIdAndUniformId(
        payment_id,
        uniform_id,
        client
      );

      if (!currentRow) {
        throw new Error(
          `No uniform payment record found for uniform_id ${uniform_id} under payment_id ${payment_id}.`
        );
      }
      if (uniform_paid > Number(currentRow.uniform_paid)) {
        throw new Error(
          `Reversal amount (${uniform_paid}) for uniform_id ${uniform_id} exceeds currently paid amount (${currentRow.uniform_paid}).`
        );
      }
      if (uniform_discount > Number(currentRow.uniform_discount)) {
        throw new Error(
          `Reversal discount (${uniform_discount}) for uniform_id ${uniform_id} exceeds currently applied discount (${currentRow.uniform_discount}).`
        );
      }

      await uniformPaymentsRepository.reverseUniformPayments(
        { payment_id, uniform_id, uniform_paid, uniform_discount },
        client
      );

      totalReverseAmount += Number(uniform_paid);
    }

    if (totalReverseAmount > 0) {
      await cascadeReverseTransactionAmount(
        payment_id,
        totalReverseAmount,
        client
      );
    }

    // Cleanup: if every uniform row for this payment_id has been fully
    // reversed away, there's nothing left to justify the leftover
    // 'uniform' transactions either -> remove them.
    const remainingUniforms = await uniformPaymentsRepository.getUniformPaymentsByPaymentId(
      payment_id,
      client
    );

    if (remainingUniforms.length === 0) {
      await transactionsRepository.deleteTransactionsByPaymentAndRemarks(
        payment_id,
        "uniform",
        client
      );
    }

    await client.query("COMMIT");

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "REVERSE_UNIFORMS_TRANSACTION",
      category: "delete",
      log_message: `Uniforms payment(s) reversed for payment_id ${payment_id}, total ${totalReverseAmount}`,
      target_entity_type: "payment",
      changes: { payment_id, uniforms, totalReverseAmount },
      success: true,
      severity: "warning"
    });

    return getTransactionsWithUniformsByPaymentId(payment_id);
  } catch (error) {
    await client.query("ROLLBACK");

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "REVERSE_UNIFORMS_TRANSACTION",
      category: "delete",
      log_message: `Failed to reverse uniforms transaction: ${error.message}`,
      target_entity_type: "payment",
      changes: { payload },
      success: false,
      severity: "warning"
    });

    throw error;
  } finally {
    client.release();
  }
};

// =========================================================
// 5. MARK RECEIVED / UN-RECEIVED -> independent action, does not
//    touch any payment/transaction amounts.
//
// INPUT: { payment_id: UUID, uniform_id: INT, received: boolean }
// OUTPUT: the updated uniformpayments row
// =========================================================
const markUniformReceived = async (payload, actor = null) => {
  const { payment_id, uniform_id, received } = payload;

  if (!payment_id || uniform_id == null || typeof received !== "boolean") {
    throw new Error(
      "payment_id, uniform_id and received (boolean) are required."
    );
  }

  try {
    await uniformPaymentsRepository.markUniformReceived({
      payment_id,
      uniform_id,
      received,
    });

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "MARK_UNIFORM_RECEIVED",
      category: "update",
      log_message: `Uniform ${uniform_id} for payment_id ${payment_id} marked received=${received}`,
      target_entity_type: "payment",
      changes: { payment_id, uniform_id, received },
      success: true
    });

    return uniformPaymentsRepository.getUniformPaymentByPaymentIdAndUniformId(
      payment_id,
      uniform_id
    );
  } catch (error) {
    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "MARK_UNIFORM_RECEIVED",
      category: "update",
      log_message: `Failed to mark uniform ${uniform_id} received for payment_id ${payment_id}: ${error.message}`,
      target_entity_type: "payment",
      success: false,
      severity: "warning"
    });

    throw error;
  }
};

module.exports = {
  createTransactionWithUniforms,
  getTransactionWithUniforms,
  getTransactionsWithUniformsByPaymentId,
  reverseTransactionUniformPayments,
  markUniformReceived,
};