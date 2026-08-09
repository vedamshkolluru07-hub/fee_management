const pool = require("../../../config/db.js");
const crypto = require("crypto");

// ======================================================
// 🔹 OTP HASH HELPER
// ======================================================
function hashOTP(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

// ======================================================
// 🔹 CREATE OTP
// ======================================================
async function createOTP({ user_id, otp, method, expires_at, used = false }) {
  const otpHash = hashOTP(otp);

  const result = await pool.query(
    `
    INSERT INTO OTPRequests (user_id, otp, method, expires_at, used)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
    `,
    [user_id, otpHash, method, expires_at, used]
  );

  return result.rows[0] || null;
}

// ======================================================
// 🔹 GET OTP BY ID
// ======================================================
async function getOTPById(otp_id) {
  const result = await pool.query(
    `
    SELECT *
    FROM OTPRequests
    WHERE otp_id = $1;
    `,
    [otp_id]
  );

  return result.rows[0] || null;
}

// ======================================================
// 🔹 GET LATEST OTP FOR USER
// ======================================================
async function getLatestOTPForUser(user_id, method = null) {
  const result = await pool.query(
    `
    SELECT *
    FROM OTPRequests
    WHERE user_id = $1
    ${method ? "AND method = $2" : ""}
    ORDER BY created_at DESC
    LIMIT 1;
    `,
    method ? [user_id, method] : [user_id]
  );

  return result.rows[0] || null;
}

// ======================================================
// 🔹 VERIFY OTP BY VALUE (FIXED)
// ======================================================
async function getOTPByValue(user_id, otp, method = null) {
  const otpHash = hashOTP(otp);

  const result = await pool.query(
    `
    SELECT *
    FROM OTPRequests
    WHERE user_id = $1
      AND otp = $2
      AND used = FALSE
      AND expires_at > NOW()
      ${method ? "AND method = $3" : ""}
    ORDER BY created_at DESC
    LIMIT 1;
    `,
    method
      ? [user_id, otpHash, method]
      : [user_id, otpHash]
  );

  return result.rows[0] || null;
}

// ======================================================
// 🔹 GET ALL OTPs
// ======================================================
async function getAllOTPs(user_id = null, limit = 50, offset = 0) {
  const result = await pool.query(
    `
    SELECT *
    FROM OTPRequests
    ${user_id ? "WHERE user_id = $1" : ""}
    ORDER BY created_at DESC
    LIMIT $${user_id ? 2 : 1}
    OFFSET $${user_id ? 3 : 2};
    `,
    user_id
      ? [user_id, limit, offset]
      : [limit, offset]
  );

  return result.rows;
}

// ======================================================
// 🔹 UPDATE OTP (SAFE)
// ======================================================
async function updateOTP(otp_id, updates) {
  const allowedFields = ["used", "expires_at"];

  const keys = Object.keys(updates).filter((k) =>
    allowedFields.includes(k)
  );

  if (!keys.length) return null;

  const setClause = keys
    .map((k, i) => `${k} = $${i + 1}`)
    .join(", ");

  const values = keys.map((k) => updates[k]);
  values.push(otp_id);

  const result = await pool.query(
    `
    UPDATE OTPRequests
    SET ${setClause}
    WHERE otp_id = $${keys.length + 1}
    RETURNING *;
    `,
    values
  );

  return result.rows[0] || null;
}

// ======================================================
// 🔹 DELETE OTP
// ======================================================
async function deleteOTP(otp_id) {
  const result = await pool.query(
    `
    DELETE FROM OTPRequests
    WHERE otp_id = $1
    RETURNING *;
    `,
    [otp_id]
  );

  return result.rows[0] || null;
}

// ======================================================
// 🔹 DELETE EXPIRED OTPs
// ======================================================
async function deleteExpiredOTPs() {
  const result = await pool.query(
    `
    DELETE FROM OTPRequests
    WHERE expires_at < NOW()
    RETURNING otp_id;
    `
  );

  return {
    deleted: result.rowCount || 0,
  };
}

module.exports = {
  createOTP,
  getOTPById,
  getLatestOTPForUser,
  getOTPByValue,
  getAllOTPs,
  updateOTP,
  deleteOTP,
  deleteExpiredOTPs,
};