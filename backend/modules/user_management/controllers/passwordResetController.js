// controllers/passwordResetController.js

const passwordResetService = require('../services/passwordResetService.js');

/**
 * ======================================================
 * 🔹 PASSWORD RESET CONTROLLER
 * ======================================================
 */
async function passwordResetController(req, res) {
  try {
    const {
      identifier,
      method,
      otp,
      token,
      newPassword,
    } = req.body;

    // -------------------------------
    // VALIDATION
    // -------------------------------
    if (!identifier || !method || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'identifier, method, and newPassword are required',
      });
    }

    if (method !== 'otp' && method !== 'token') {
      return res.status(400).json({
        success: false,
        message: 'method must be otp or token',
      });
    }

    if (method === 'otp' && !otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required for otp reset',
      });
    }

    if (method === 'token' && !token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required for token reset',
      });
    }

    // -------------------------------
    // SERVICE CALL
    // -------------------------------
    const result = await passwordResetService.handlePasswordResetFlow({
      identifier,
      method,
      otp,
      token,
      newPassword,
    });

    // -------------------------------
    // RESPONSE HANDLING
    // -------------------------------
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('passwordResetController error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

module.exports = {
  passwordResetController,
};