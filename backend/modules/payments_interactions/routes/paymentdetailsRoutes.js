const express = require("express");
const router = express.Router();

const {
    getPaymentById,
    getPaymentDetailsById,
} = require("../controllers/paymentDetailsController.js");

// Plain payment row: GET /api/payments/details/:payment_id
router.get("/:payment_id", getPaymentById);

// Full summary (payment + student/class + tuition/books/uniform streams):
// GET /api/payments/details/:payment_id/full
router.get("/:payment_id/full", getPaymentDetailsById);

module.exports = router;