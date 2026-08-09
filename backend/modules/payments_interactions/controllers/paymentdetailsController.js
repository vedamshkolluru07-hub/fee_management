const {
    getPaymentOnly,
    getPaymentDetails,
} = require("../services/paymentDetailsService.js");

// =========================================================
// 1. GET PLAIN PAYMENT ROW
// GET /api/payments/details/:payment_id
// =========================================================
const getPaymentById = async (req, res) => {
    try {
        const { payment_id } = req.params;

        const result = await getPaymentOnly(payment_id);

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
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// =========================================================
// 2. GET FULL PAYMENT SUMMARY
// GET /api/payments/details/:payment_id/full
// =========================================================
const getPaymentDetailsById = async (req, res) => {
    try {
        const { payment_id } = req.params;

        const result = await getPaymentDetails(payment_id);

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
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    getPaymentById,
    getPaymentDetailsById,
};