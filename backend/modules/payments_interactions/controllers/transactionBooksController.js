const {
    createTransactionWithBooks,
    getTransactionWithBooks,
    getTransactionsWithBooksByPaymentId,
    reverseTransactionBookPayments,
    markBookReceived,
} = require("../services/transactionBooksService.js");

// =========================================================
// 1. CREATE TRANSACTION WITH BOOKS
// POST /transactions/books
// BODY:
//   {
//     student_id, class_id, academic_year_id, payment_method,
//     transaction_id?, payment_date?,
//     books: [{ book_id, books_paid, books_discount, received }]
//   }
// RESPONSE 201: { success, message, data: { ...transaction, books } }
// =========================================================
const createTransaction = async (req, res) => {
    try {
        const payload = req.body;

        const result = await createTransactionWithBooks(payload, req.user);

        return res.status(201).json({
            success: true,
            message: "Transaction with books created successfully",
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// =========================================================
// 2. GET SINGLE TRANSACTION WITH BOOKS
// GET /transactions/books/:transaction_pk
// RESPONSE 200: { success, data: { ...transaction, books } }
// RESPONSE 404: { success: false, message } if not found
// =========================================================
const getTransaction = async (req, res) => {
    try {
        const { transaction_pk } = req.params;

        const result = await getTransactionWithBooks(transaction_pk);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =========================================================
// 3. GET ALL BOOKS TRANSACTIONS + BOOK ROWS BY PAYMENT ID
// GET /transactions/books/payment/:payment_id
// RESPONSE 200: { success, data: { transactions: [...], books: [...] } }
// =========================================================
const getByPaymentId = async (req, res) => {
    try {
        const { payment_id } = req.params;

        const result = await getTransactionsWithBooksByPaymentId(payment_id);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =========================================================
// 4. REVERSE TRANSACTION BOOK PAYMENTS
// POST /transactions/books/reverse
// BODY:
//   {
//     payment_id,
//     books: [{ book_id, books_paid, books_discount? }]
//   }
// RESPONSE 200: { success, message, data: { transactions, books } }
// =========================================================
const reverseTransaction = async (req, res) => {
    try {
        const payload = req.body;

        const result = await reverseTransactionBookPayments(payload, req.user);

        return res.status(200).json({
            success: true,
            message: "Transaction book payment reversed successfully",
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// =========================================================
// 5. MARK BOOK RECEIVED / UN-RECEIVED
// POST /transactions/books/received
// BODY:
//   { payment_id, book_id, received: true|false }
// RESPONSE 200: { success, message, data: { ...bookspayments row } }
// =========================================================
const markReceived = async (req, res) => {
    try {
        const payload = req.body;

        const result = await markBookReceived(payload, req.user);

        return res.status(200).json({
            success: true,
            message: "Book received status updated successfully",
            data: result,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    createTransaction,
    getTransaction,
    getByPaymentId,
    reverseTransaction,
    markReceived,
};