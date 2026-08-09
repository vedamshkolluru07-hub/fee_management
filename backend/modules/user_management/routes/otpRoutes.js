// routes/otpRoutes.js

const express = require("express");
const router = express.Router();

const otpController = require("../controllers/otpController.js");

// ======================================================
// 🔹 SEND OTP
// POST /api/otp/send
// ======================================================
router.post("/send", otpController.sendOTP);

// ======================================================
// 🔹 VERIFY OTP
// POST /api/otp/verify
// ======================================================
router.post("/verify", otpController.verifyOTP);

// ======================================================
// 🔹 GET ALL OTPs (ADMIN / DEBUG)
// GET /api/otp/all
// ======================================================
router.get("/all", otpController.getAllOTPs);

module.exports = router;