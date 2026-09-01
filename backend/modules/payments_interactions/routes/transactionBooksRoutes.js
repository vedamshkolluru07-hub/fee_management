const express = require("express");
const router = express.Router();
const {
    createTransaction,
    getTransaction,
    getByPaymentId,
    reverseTransaction,
    markReceived,
} = require("../controllers/transactionBooksController.js");
const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');

// Create a books transaction (+ book rows)
router.post("/", requireSession, attachUser , createTransaction);

// Get all books transactions + book rows for a payment_id
router.get("/payment/:payment_id", getByPaymentId);

// Get single transaction (+ all book rows for its payment_id)
router.get("/:transaction_pk", getTransaction);

// Reverse book payment(s) - cascades across transactions in code
router.post("/reverse", requireSession, attachUser , reverseTransaction);

// Mark a book received / un-received (independent action)
router.post("/received", requireSession, attachUser , markReceived);

module.exports = router;