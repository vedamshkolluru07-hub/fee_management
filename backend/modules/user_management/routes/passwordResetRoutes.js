// routes/passwordResetRoutes.js

const express = require('express');
const router = express.Router();

const { passwordResetController } = require('../controllers/passwordResetController.js');

/**
 * ======================================================
 * 🔹 PASSWORD RESET ROUTE
 * ======================================================
 */

// Reset password using OTP or token
router.post('/password-reset', passwordResetController);

module.exports = router;