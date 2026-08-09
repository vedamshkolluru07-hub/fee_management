// services/tokenService.js

const crypto = require("crypto");

const { getUser } = require("../repositories/userRepository.js");

const {
  createToken,
  getAllTokens,
} = require("../repositories/tokenRepository.js");

const { sendMail } = require("../../../utils/nodemailerUtil.js");

// ======================================================
// 🔹 GENERATE SECURE TOKEN
// ======================================================
function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

// ======================================================
// 🔹 SEND PASSWORD RESET TOKEN
// ======================================================
async function sendPasswordResetToken({ identifier }) {
  try {
    // 1. FIND USER
    const user = await getUser(identifier);

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // 2. VALIDATE EMAIL
    if (!user.email) {
      return {
        success: false,
        message: "User does not have a registered email address",
      };
    }

    // 3. GENERATE TOKEN
    const token = generateResetToken();

    // 4. SET EXPIRY (15 MINUTES)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // 5. STORE TOKEN IN DATABASE
    const tokenRecord = await createToken({
      user_id: user.user_id,
      token,
      expires_at: expiresAt,
    });

    if (!tokenRecord) {
      return {
        success: false,
        message: "Failed to create reset token",
      };
    }

    // 6. EMAIL TEMPLATE
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Password Reset Request</h2>

        <p>Hello ${user.first_name || user.username || "User"},</p>

        <p>We received a request to reset your password.</p>

        <p>Use the token below to reset your password:</p>

        <div style="
            padding: 12px;
            background: #f4f4f4;
            border-radius: 6px;
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 1px;
            margin: 20px 0;
          ">
          ${token}
        </div>

        <p>This token will expire in 15 minutes.</p>

        <p>If you did not request this password reset, please ignore this email.</p>

        <br />

        <p>
          Regards,<br />
          Auth System
        </p>
      </div>
    `;

    // 7. SEND EMAIL
    const emailResult = await sendMail(
      user.email,
      "Password Reset Token",
      html
    );

    if (!emailResult.success) {
      return {
        success: false,
        message: "Failed to send reset email",
      };
    }

    // 8. RESPONSE (DO NOT EXPOSE TOKEN IN PRODUCTION)
    return {
      success: true,
      message: "Password reset token sent successfully",
      token_id: tokenRecord.token_id,
      expires_at: expiresAt,
    };
  } catch (error) {
    console.error("[Token Service] sendPasswordResetToken error:", error);

    return {
      success: false,
      message: "Internal server error while sending reset token",
    };
  }
}

// ======================================================
// 🔹 GET ALL TOKENS SERVICE
// ======================================================
async function getAllTokensService(user_id = null, limit = 50, offset = 0) {
  try {
    const data = await getAllTokens(user_id, limit, offset);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("[Token Service] getAllTokensService error:", error);

    return {
      success: false,
      message: "Failed to fetch tokens",
    };
  }
}

// ======================================================
// 🔹 EXPORTS
// ======================================================
module.exports = {
  sendPasswordResetToken,
  getAllTokensService,
};