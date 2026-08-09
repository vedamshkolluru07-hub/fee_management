// controllers/tokenController.js

const tokenService = require("../services/tokenService.js");

// ======================================================
// 🔹 SEND PASSWORD RESET TOKEN CONTROLLER
// ======================================================
async function sendPasswordResetToken(req, res) {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Identifier is required",
      });
    }

    const result = await tokenService.sendPasswordResetToken({
      identifier,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[Token Controller] sendPasswordResetToken error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// ======================================================
// 🔹 GET ALL TOKENS CONTROLLER (ADMIN / DEBUG)
// ======================================================
async function getAllTokens(req, res) {
  try {
    const user_id = req.query.user_id || null;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await tokenService.getAllTokensService(
      user_id,
      limit,
      offset
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[Token Controller] getAllTokens error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tokens",
    });
  }
}

// ======================================================
// 🔹 EXPORTS
// ======================================================
module.exports = {
  sendPasswordResetToken,
  getAllTokens,
};