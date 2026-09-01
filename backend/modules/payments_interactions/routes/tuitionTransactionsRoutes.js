const express = require("express");
const router = express.Router();

const {
    createTransaction,
    reverseTransaction,
    getByPaymentId,
} = require("../controllers/tuitionTransactionsController.js");
const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');

// Create
router.post("/", requireSession, attachUser , createTransaction);

// Reverse
router.post("/reverse", requireSession, attachUser , reverseTransaction);

// Get payment with tuition transactions
router.get("/:payment_id", getByPaymentId);

module.exports = router;