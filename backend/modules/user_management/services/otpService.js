// services/otpService.js

const crypto = require("crypto");

const { getUser } = require("../repositories/userRepository.js");
const {
  createOTP,
  getAllOTPs,
  getOTPByValue,
  updateOTP,
} = require("../repositories/otpRepository.js");

const { msg91UtilsSendOTP } = require("../../../utils/msg91Util.js");

// ======================================================
// 🔹 GENERATE OTP (SECURE)
// ======================================================
function generateOTP(length = 6) {
  const max = Math.pow(10, length);
  return crypto
    .randomInt(0, max)
    .toString()
    .padStart(length, "0");
}

// ======================================================
// 🔹 SEND OTP (MAIN SERVICE)
// ======================================================
async function sendOTP({ identifier, method = "sms" }) {
  try {
    // 1. FIND USER
    const user = await getUser(identifier);

    if (!user) {
      return { success: false, message: "User not found" };
    }

    if (!user.phone) {
      return {
        success: false,
        message: "User does not have a registered phone number",
      };
    }

    // 2. GENERATE OTP
    const otp = generateOTP(6);

    // 3. SET EXPIRY (5 MINUTES)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 4. STORE OTP IN DB
    const otpRecord = await createOTP({
      user_id: user.user_id,
      otp,
      method,
      expires_at: expiresAt,
      used: false,
    });

    if (!otpRecord) {
      return {
        success: false,
        message: "Failed to create OTP record",
      };
    }

    // 5. SEND OTP VIA MSG91
    await msg91UtilsSendOTP(user.phone, otp);

    // 6. RETURN RESPONSE (NEVER SEND OTP BACK)
    return {
      success: true,
      message: "OTP sent successfully",
      otp_id: otpRecord.otp_id,
      expires_at: expiresAt,
    };
  } catch (error) {
    console.error("[OTP Service] sendOTP error:", error);

    return {
      success: false,
      message: "Internal server error while sending OTP",
    };
  }
}

// ======================================================
// 🔹 VERIFY OTP SERVICE (ADDED + FIXED FLOW)
// ======================================================
async function verifyOTP({ user_id, otp, method = "sms" }) {
  try {
    const record = await getOTPByValue(user_id, otp, method);

    if (!record) {
      return {
        success: false,
        message: "Invalid or expired OTP",
      };
    }

    await updateOTP(record.otp_id, { used: true });

    return {
      success: true,
      message: "OTP verified successfully",
    };
  } catch (error) {
    console.error("[OTP Service] verifyOTP error:", error);

    return {
      success: false,
      message: "Internal server error while verifying OTP",
    };
  }
}

// ======================================================
// 🔹 GET ALL OTPs SERVICE (ADMIN / DEBUG)
// ======================================================
async function getAllOTPsService(user_id = null, limit = 50, offset = 0) {
  try {
    const data = await getAllOTPs(user_id, limit, offset);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("[OTP Service] getAllOTPsService error:", error);

    return {
      success: false,
      message: "Failed to fetch OTP records",
    };
  }
}

// ======================================================
// 🔹 EXPORTS
// ======================================================
module.exports = {
  sendOTP,
  verifyOTP,
  getAllOTPsService,
};