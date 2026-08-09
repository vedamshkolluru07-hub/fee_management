const db = require('../../../utils/db.js');
const bcrypt = require('../../../utils/bycryptUtil.js');
const crypto = require('crypto');

/**
 * ======================================================
 * 🔹 HASH HELPERS (MUST MATCH REPOSITORIES)
 * ======================================================
 */
function hashOTP(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * ======================================================
 * 🔹 FIND USER
 * ======================================================
 */
async function findUser(identifier) {
  const res = await db.query(
    `
    SELECT * FROM Users
    WHERE (username = $1 OR phone = $1 OR email = $1)
      AND deleted = FALSE
    LIMIT 1
    `,
    [identifier]
  );

  return res.rows[0] || null;
}

/**
 * ======================================================
 * 🔹 VERIFY OTP (HASHED + SAFE)
 * ======================================================
 */
async function verifyOTPForReset(user_id, otp, method) {
  const otpHash = hashOTP(otp);

  const res = await db.query(
    `
    SELECT *
    FROM OTPRequests
    WHERE user_id = $1
      AND method = $2
      AND used = FALSE
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [user_id, method]
  );

  const record = res.rows[0];

  if (!record) return { valid: false, message: 'OTP not found' };
  if (record.otp !== otpHash) return { valid: false, message: 'Invalid OTP' };

  return { valid: true, record };
}

/**
 * ======================================================
 * 🔹 VERIFY RESET TOKEN (HASHED + SAFE)
 * ======================================================
 */
async function verifyResetToken(token) {
  const tokenHash = hashToken(token);

  const res = await db.query(
    `
    SELECT *
    FROM PasswordResetTokens
    WHERE token = $1
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [tokenHash]
  );

  const record = res.rows[0];

  if (!record) return { valid: false, message: 'Token not found' };

  return { valid: true, record };
}

/**
 * ======================================================
 * 🔹 UPDATE PASSWORD
 * ======================================================
 */
async function updateUserPassword(user_id, newPassword) {
  const hash = await bcrypt.hash(newPassword, 10);

  const res = await db.query(
    `
    UPDATE Users
    SET password_hash = $1,
        last_action_at = CURRENT_TIMESTAMP
    WHERE user_id = $2
    RETURNING user_id
    `,
    [hash, user_id]
  );

  return res.rows[0] || null;
}

/**
 * ======================================================
 * 🔹 MARK OTP USED
 * ======================================================
 */
async function markOTPUsed(otp_id) {
  await db.query(
    `
    UPDATE OTPRequests
    SET used = TRUE
    WHERE otp_id = $1
    `,
    [otp_id]
  );
}

/**
 * ======================================================
 * 🔹 MARK TOKEN USED
 * ======================================================
 */
async function markTokenUsed(token_id) {
  await db.query(
    `
    UPDATE PasswordResetTokens
    SET used = TRUE
    WHERE token_id = $1
    `,
    [token_id]
  );
}

/**
 * ======================================================
 * 🔹 FULL PASSWORD RESET FLOW
 * ======================================================
 */
async function handlePasswordResetFlow({
  identifier,
  method,
  otp,
  token,
  newPassword,
}) {
  try {
    const user = await findUser(identifier);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (method === 'otp') {
      const verification = await verifyOTPForReset(user.user_id, otp, 'email');
      if (!verification.valid)
        return { success: false, message: verification.message };

      const updated = await updateUserPassword(user.user_id, newPassword);
      if (!updated)
        return { success: false, message: 'Password update failed' };

      await markOTPUsed(verification.record.otp_id);

      return { success: true, message: 'Password reset successful' };
    }

    if (method === 'token') {
      const verification = await verifyResetToken(token);
      if (!verification.valid)
        return { success: false, message: verification.message };

      const updated = await updateUserPassword(user.user_id, newPassword);
      if (!updated)
        return { success: false, message: 'Password update failed' };

      await markTokenUsed(verification.record.token_id);

      return { success: true, message: 'Password reset successful' };
    }

    return { success: false, message: 'Invalid reset method' };
  } catch (err) {
    return {
      success: false,
      message: 'Server error during password reset',
    };
  }
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  findUser,
  verifyOTPForReset,
  verifyResetToken,
  updateUserPassword,
  handlePasswordResetFlow,
};