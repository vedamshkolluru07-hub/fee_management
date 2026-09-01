const express = require("express");
const router = express.Router();
const {
    createTransaction,
    getTransaction,
    getByPaymentId,
    reverseTransaction,
    markReceived,
} = require("../controllers/transactionUniformsController.js");
const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');

// Create a uniform transaction (+ uniform rows)
router.post("", requireSession, attachUser , createTransaction);

// Get all uniform transactions + uniform rows for a payment_id
router.get("/payment/:payment_id", getByPaymentId);

// Get single transaction (+ all uniform rows for its payment_id)
router.get("/:transaction_pk", getTransaction);

// Reverse uniform payment(s) - cascades across transactions in code
router.post("/reverse", requireSession, attachUser , reverseTransaction);

// Mark a uniform received / un-received (independent action)
router.post("/received", requireSession, attachUser , markReceived);

module.exports = router;