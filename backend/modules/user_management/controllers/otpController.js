// controllers/otpController.js

const otpService = require("../services/otpService.js");

// ======================================================
// 🔹 SEND OTP CONTROLLER
// ======================================================
async function sendOTP(req, res) {
  try {
    const { identifier, method } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Identifier is required",
      });
    }

    const result = await otpService.sendOTP({
      identifier,
      method: method || "sms",
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[OTP Controller] sendOTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// ======================================================
// 🔹 VERIFY OTP CONTROLLER
// ======================================================
async function verifyOTP(req, res) {
  try {
    const { user_id, otp, method } = req.body;

    if (!user_id || !otp) {
      return res.status(400).json({
        success: false,
        message: "user_id and otp are required",
      });
    }

    const result = await otpService.verifyOTP({
      user_id,
      otp,
      method: method || "sms",
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[OTP Controller] verifyOTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// ======================================================
// 🔹 GET ALL OTPs CONTROLLER (ADMIN ONLY)
// ======================================================
async function getAllOTPs(req, res) {
  try {
    const user_id = req.query.user_id || null;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await otpService.getAllOTPsService(
      user_id,
      limit,
      offset
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[OTP Controller] getAllOTPs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch OTP records",
    });
  }
}

// ======================================================
// 🔹 EXPORTS
// ======================================================
module.exports = {
  sendOTP,
  verifyOTP,
  getAllOTPs,
};