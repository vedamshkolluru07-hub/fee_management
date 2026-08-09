// routes/tokenRoutes.js

const express = require("express");
const router = express.Router();

const tokenController = require("../controllers/tokenController.js");

// ======================================================
// 🔹 SEND PASSWORD RESET TOKEN
// POST /api/token/reset-password
// ======================================================
router.post(
  "/reset-password",
  tokenController.sendPasswordResetToken
);

// ======================================================
// 🔹 GET ALL TOKENS (ADMIN / DEBUG)
// GET /api/token/all
// ======================================================
router.get("/all", tokenController.getAllTokens);

module.exports = router;