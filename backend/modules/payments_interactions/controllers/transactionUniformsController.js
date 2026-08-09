const {
    createTransactionWithUniforms,
    getTransactionWithUniforms,
    getTransactionsWithUniformsByPaymentId,
    reverseTransactionUniformPayments,
    markUniformReceived,
} = require("../services/transactionUniformsService.js");

// =========================================================
// 1. CREATE TRANSACTION WITH UNIFORMS
// POST /transactions/uniforms
// BODY:
//   {
//     student_id, class_id, academic_year_id, payment_method,
//     transaction_id?, payment_date?,
//     uniforms: [{ uniform_id, uniform_paid, uniform_discount, received }]
//   }
// RESPONSE 201: { success, message, data: { ...transaction, uniforms } }
// =========================================================
const createTransaction = async (req, res) => {
    try {
        const payload = req.body;

        const result = await createTransactionWithUniforms(payload, req.user);

        return res.status(201).json({
            success: true,
            message: "Transaction with uniforms created successfully",
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
// 2. GET SINGLE TRANSACTION WITH UNIFORMS
// GET /transactions/uniforms/:transaction_pk
// RESPONSE 200: { success, data: { ...transaction, uniforms } }
// RESPONSE 404: { success: false, message } if not found
// =========================================================
const getTransaction = async (req, res) => {
    try {
        const { transaction_pk } = req.params;

        const result = await getTransactionWithUniforms(transaction_pk);

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
// 3. GET ALL UNIFORM TRANSACTIONS + UNIFORM ROWS BY PAYMENT ID
// GET /transactions/uniforms/payment/:payment_id
// RESPONSE 200: { success, data: { transactions: [...], uniforms: [...] } }
// =========================================================
const getByPaymentId = async (req, res) => {
    try {
        const { payment_id } = req.params;

        const result = await getTransactionsWithUniformsByPaymentId(payment_id);

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
// 4. REVERSE TRANSACTION UNIFORM PAYMENTS
// POST /transactions/uniforms/reverse
// BODY:
//   {
//     payment_id,
//     uniforms: [{ uniform_id, uniform_paid, uniform_discount? }]
//   }
// RESPONSE 200: { success, message, data: { transactions, uniforms } }
// =========================================================
const reverseTransaction = async (req, res) => {
    try {
        const payload = req.body;

        const result = await reverseTransactionUniformPayments(payload, req.user);

        return res.status(200).json({
            success: true,
            message: "Transaction uniform payment reversed successfully",
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
// 5. MARK UNIFORM RECEIVED / UN-RECEIVED
// POST /transactions/uniforms/received
// BODY:
//   { payment_id, uniform_id, received: true|false }
// RESPONSE 200: { success, message, data: { ...uniformpayments row } }
// =========================================================
const markReceived = async (req, res) => {
    try {
        const payload = req.body;

        const result = await markUniformReceived(payload, req.user);

        return res.status(200).json({
            success: true,
            message: "Uniform received status updated successfully",
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