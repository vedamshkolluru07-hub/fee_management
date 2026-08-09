const {
    createTuitionTransaction,
    reverseTuitionTransaction,
    getPaymentWithTuitionTransactions,
} = require("../services/tuitionTransactionsService.js");

// =========================================================
// 1. CREATE TUITION TRANSACTION
// POST /transactions/tuition
// =========================================================
const createTransaction = async (req, res) => {
    try {
        const payload = req.body;

        // externalClient is null here (standalone call, this route owns
        // its own transaction), so pass req.user as the 3rd arg (actor).
        const result = await createTuitionTransaction(payload, null, req.user);

        return res.status(201).json({
            success: true,
            message: "Tuition transaction created successfully",
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
// 2. REVERSE TUITION TRANSACTION
// POST /transactions/tuition/reverse
// =========================================================
const reverseTransaction = async (req, res) => {
    try {
        const payload = req.body;

        const result = await reverseTuitionTransaction(payload, null, req.user);

        return res.status(200).json({
            success: true,
            message: "Tuition transaction reversed successfully",
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
// 3. GET PAYMENT WITH TUITION TRANSACTIONS
// GET /transactions/tuition/payment/:payment_id
// =========================================================
const getByPaymentId = async (req, res) => {
    try {
        const { payment_id } = req.params;

        const result = await getPaymentWithTuitionTransactions(payment_id);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
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

module.exports = {
    createTransaction,
    reverseTransaction,
    getByPaymentId,
};