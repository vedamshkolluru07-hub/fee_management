// routes/loginAttemptsRoutes.js

const express = require('express');
const router = express.Router();

const loginAttemptsController = require('../controllers/loginAttemptsController.js');

/**
 * ======================================================
 * 🔹 GET USER LOGIN ATTEMPTS
 * ======================================================
 * Route: GET /login-attempts/:user_id
 */
router.get(
  '/:user_id',
  loginAttemptsController.getUserLoginAttemptsController
);

module.exports = router;
 