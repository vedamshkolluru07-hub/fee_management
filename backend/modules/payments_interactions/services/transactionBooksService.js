// modules/payments_interactions/services/transactionBooksService.js
const db = require("../../../config/db.js");
const transactionsRepository = require("../repositories/transactionsRepository.js");
const bookPaymentsRepository = require("../repositories/bookPaymentsRepository.js");
// ASSUMPTION: confirm this path is correct for your project layout
const studentClassRepository = require("../repositories/studentClassRepository.js");
const {
  createAuditLogService
} = require("../../user_management/services/auditLogServiceCreate.js");

const VALID_PAYMENT_METHODS = ["cash", "card", "online"];

// Floor kept in application code only (NOT a DB constraint), per design
// decision: a 'books' transaction is never reversed below this amount —
// any leftover reversal carries over to the next older 'books' transaction.
const RESERVE_FLOOR = 100;

// =========================================================
// 1. CREATE -> resolve payment_id via studentClassRepository.getPaymentId
//              + transactionsRepository.createTransactions
//              + bookPaymentsRepository.createBookPayments per book
//    All run against the SAME client so the whole operation is atomic.
//
// INPUT (payload):
//   {
//     student_id, class_id, academic_year_id: identify the enrollment
//     payment_method: 'cash'|'card'|'online'
//     transaction_id: string|null (optional external reference)
//     payment_date: timestamp|null (optional)
//     books: [
//       { book_id, books_paid, books_discount, received }, ...
//     ]
//   }
//   NOTE: amount_paid on the transaction row = SUM of books[].books_paid
//
// OUTPUT: { ...transaction row, books: [ ...bookspayments rows ] }
// =========================================================
const createTransactionWithBooks = async (payload, actor = null) => {
  const client = await db.connect();
  try {
    const {
      student_id,
      class_id,
      academic_year_id,
      payment_method,
      transaction_id = null,
      payment_date = null,
      books,
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
    if (!Array.isArray(books) || books.length === 0) {
      throw new Error("books must be a non-empty array.");
    }
    for (const b of books) {
      if (b.book_id == null) {
        throw new Error("Each book entry requires a book_id.");
      }
    }

    const totalPaid = books.reduce(
      (sum, b) => sum + Number(b.books_paid || 0),
      0
    );
    if (totalPaid <= 0) {
      throw new Error(
        "Total books_paid across all books must be greater than 0."
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
        remarks: "books",
        payment_date,
      },
      client
    );

    const bookItems = books.map((b) => ({
      payment_id,
      book_id: b.book_id,
      books_paid: b.books_paid || 0,
      books_discount: b.books_discount || 0,
      received: b.received || false,
    }));

    await bookPaymentsRepository.createBookPayments(bookItems, client);

    await client.query("COMMIT");

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "CREATE_BOOKS_TRANSACTION",
      category: "create",
      log_message: `Books payment of ${totalPaid} recorded for payment_id ${payment_id} (student ${student_id})`,
      target_entity_type: "payment",
      changes: { payment_id, student_id, class_id, academic_year_id, totalPaid, books: bookItems },
      success: true
    });

    return getTransactionWithBooks(transaction.transaction_pk);
  } catch (error) {
    await client.query("ROLLBACK");

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "CREATE_BOOKS_TRANSACTION",
      category: "create",
      log_message: `Failed to record books transaction: ${error.message}`,
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
// 2. READ -> single transaction row + ALL bookspayments rows for
//    that transaction's payment_id (bookspayments is cumulative per
//    payment_id+book_id, it is NOT scoped to one single transaction).
//
// INPUT: transaction_pk: UUID
// OUTPUT: { ...transaction row, books: [...] } or null if not found
// =========================================================
const getTransactionWithBooks = async (transaction_pk) => {
  const transaction = await transactionsRepository.getTransactionByPk(
    transaction_pk
  );
  if (!transaction) {
    return null;
  }
  const books = await bookPaymentsRepository.getBookPaymentsByPaymentId(
    transaction.payment_id
  );
  return { ...transaction, books };
};

// =========================================================
// 3. READ MANY -> all 'books' transactions + the (shared) book rows
//    for a given payment_id.
//
// INPUT: payment_id: UUID
// OUTPUT: {
//   transactions: [ ...transaction rows, newest first ],
//   books: [ ...bookspayments rows ]
// }
// =========================================================
const getTransactionsWithBooksByPaymentId = async (payment_id) => {
  const transactions = await transactionsRepository.getTransactions({
    payment_id,
    remarks: "books",
    order: "DESC",
  });
  const books = await bookPaymentsRepository.getBookPaymentsByPaymentId(
    payment_id
  );
  return { transactions, books };
};

// =========================================================
// INTERNAL HELPER: cascade a total reversal amount across the
// payment_id's 'books' transactions, newest -> oldest, never taking
// any single transaction below RESERVE_FLOOR. Leftover carries to
// the next older transaction. Transactions are only ever UPDATED
// here, never deleted (deletion of leftover rows, if applicable,
// happens separately once all book rows are gone - see step 4).
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
    { payment_id, remarks: "books", order: "DESC", forUpdate: true },
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
// 4. REVERSE -> validates each book's reversal amount against what's
//    currently paid, reverses each book row (auto-deletes the row if
//    it hits 0), cascades the total amount across 'books' transactions
//    (floored, never deleted here), then cleans up any leftover
//    'books' transactions if NO book rows remain for the payment_id.
//
// INPUT (payload):
//   {
//     payment_id: UUID (required),
//     books: [
//       { book_id, books_paid, books_discount? }, ...
//     ]
//   }
//   NOTE: books_discount is optional per entry.
//
// OUTPUT: {
//   transactions: [ ...remaining 'books' transaction rows ],
//   books: [ ...remaining bookspayments rows ]
// }
// =========================================================
const reverseTransactionBookPayments = async (payload, actor = null) => {
  const client = await db.connect();
  try {
    const { payment_id, books } = payload;

    if (!payment_id) {
      throw new Error("payment_id is required.");
    }
    if (!Array.isArray(books) || books.length === 0) {
      throw new Error("books must be a non-empty array.");
    }

    await client.query("BEGIN");

    let totalReverseAmount = 0;

    for (const b of books) {
      const { book_id, books_paid = 0, books_discount = 0 } = b;

      if (book_id == null) {
        throw new Error("Each book entry requires a book_id.");
      }
      if (books_paid < 0 || books_discount < 0) {
        throw new Error("Reversal amounts cannot be negative.");
      }

      // Validate bounds: reversal must be within 0..currently_paid
      const currentRow = await bookPaymentsRepository.getBookPaymentByPaymentIdAndBookId(
        payment_id,
        book_id,
        client
      );

      if (!currentRow) {
        throw new Error(
          `No book payment record found for book_id ${book_id} under payment_id ${payment_id}.`
        );
      }
      if (books_paid > Number(currentRow.books_paid)) {
        throw new Error(
          `Reversal amount (${books_paid}) for book_id ${book_id} exceeds currently paid amount (${currentRow.books_paid}).`
        );
      }
      if (books_discount > Number(currentRow.books_discount)) {
        throw new Error(
          `Reversal discount (${books_discount}) for book_id ${book_id} exceeds currently applied discount (${currentRow.books_discount}).`
        );
      }

      await bookPaymentsRepository.reverseBookPayments(
        { payment_id, book_id, books_paid, books_discount },
        client
      );

      totalReverseAmount += Number(books_paid);
    }

    if (totalReverseAmount > 0) {
      await cascadeReverseTransactionAmount(
        payment_id,
        totalReverseAmount,
        client
      );
    }

    // Cleanup: if every book row for this payment_id has been fully
    // reversed away, there's nothing left to justify the leftover
    // 'books' transactions either -> remove them.
    const remainingBooks = await bookPaymentsRepository.getBookPaymentsByPaymentId(
      payment_id,
      client
    );

    if (remainingBooks.length === 0) {
      await transactionsRepository.deleteTransactionsByPaymentAndRemarks(
        payment_id,
        "books",
        client
      );
    }

    await client.query("COMMIT");

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "REVERSE_BOOKS_TRANSACTION",
      category: "delete",
      log_message: `Books payment(s) reversed for payment_id ${payment_id}, total ${totalReverseAmount}`,
      target_entity_type: "payment",
      changes: { payment_id, books, totalReverseAmount },
      success: true,
      severity: "warning"
    });

    return getTransactionsWithBooksByPaymentId(payment_id);
  } catch (error) {
    await client.query("ROLLBACK");

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "REVERSE_BOOKS_TRANSACTION",
      category: "delete",
      log_message: `Failed to reverse books transaction: ${error.message}`,
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
// INPUT: { payment_id: UUID, book_id: INT, received: boolean }
// OUTPUT: the updated bookspayments row
// =========================================================
const markBookReceived = async (payload, actor = null) => {
  const { payment_id, book_id, received } = payload;

  if (!payment_id || book_id == null || typeof received !== "boolean") {
    throw new Error(
      "payment_id, book_id and received (boolean) are required."
    );
  }

  try {
    await bookPaymentsRepository.markBookReceived({
      payment_id,
      book_id,
      received,
    });

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "MARK_BOOK_RECEIVED",
      category: "update",
      log_message: `Book ${book_id} for payment_id ${payment_id} marked received=${received}`,
      target_entity_type: "payment",
      changes: { payment_id, book_id, received },
      success: true
    });

    return bookPaymentsRepository.getBookPaymentByPaymentIdAndBookId(
      payment_id,
      book_id
    );
  } catch (error) {
    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "MARK_BOOK_RECEIVED",
      category: "update",
      log_message: `Failed to mark book ${book_id} received for payment_id ${payment_id}: ${error.message}`,
      target_entity_type: "payment",
      success: false,
      severity: "warning"
    });

    throw error;
  }
};

module.exports = {
  createTransactionWithBooks,
  getTransactionWithBooks,
  getTransactionsWithBooksByPaymentId,
  reverseTransactionBookPayments,
  markBookReceived,
};