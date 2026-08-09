// modules/payments_interactions/services/paymentDetailsService.js
//
// Read-only service for fetching a payment by payment_id. Two levels:
//  - getPaymentOnly: just the payments row (fast path).
//  - getPaymentDetails: the payments row plus the student/class it
//    belongs to, and every tuition/books/uniform transaction and line
//    item recorded against it (one-stop payment summary).

const paymentsRepository = require("../repositories/paymentsRepository.js");
const studentClassesRepository = require("../repositories/student_classesRepository.js");
const transactionsRepository = require("../repositories/transactionsRepository.js");
const bookPaymentsRepository = require("../repositories/bookPaymentsRepository.js");
const uniformPaymentsRepository = require("../repositories/uniformPaymentsRepository.js");

// =========================================================
// 1. PLAIN FETCH -> payments row only
// =========================================================
const getPaymentOnly = async (payment_id) => {
  if (!payment_id) {
    throw new Error("payment_id is required.");
  }

  return paymentsRepository.getPaymentById(payment_id);
};

// =========================================================
// 2. FULL FETCH -> payments row + student_class + all streams
// =========================================================
const getPaymentDetails = async (payment_id) => {
  if (!payment_id) {
    throw new Error("payment_id is required.");
  }

  const payment = await paymentsRepository.getPaymentById(payment_id);

  if (!payment) {
    return null;
  }

  const [
    studentClass,
    tuitionTransactions,
    bookTransactions,
    bookItems,
    uniformTransactions,
    uniformItems,
  ] = await Promise.all([
    studentClassesRepository.getByPaymentId(payment_id),
    transactionsRepository.getTransactions({
      payment_id,
      remarks: "tuition",
      limit: null,
    }),
    transactionsRepository.getTransactions({
      payment_id,
      remarks: "books",
      limit: null,
    }),
    bookPaymentsRepository.getBookPaymentsByPaymentId(payment_id),
    transactionsRepository.getTransactions({
      payment_id,
      remarks: "uniform",
      limit: null,
    }),
    uniformPaymentsRepository.getUniformPaymentsByPaymentId(payment_id),
  ]);

  return {
    payment,
    student_class: studentClass,
    tuition: {
      transactions: tuitionTransactions,
    },
    books: {
      transactions: bookTransactions,
      items: bookItems,
    },
    uniforms: {
      transactions: uniformTransactions,
      items: uniformItems,
    },
  };
};

// =========================================================
// EXPORTS
// =========================================================
module.exports = {
  getPaymentOnly,
  getPaymentDetails,
};