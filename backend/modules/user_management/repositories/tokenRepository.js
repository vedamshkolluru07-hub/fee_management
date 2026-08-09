const pool = require("../../../config/db.js");
const crypto = require("crypto");

// ======================================================
// 🔹 TOKEN HASH HELPER
// ======================================================
function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

// ======================================================
// 🔹 CREATE TOKEN
// NOTE: schema does NOT have "used", so we remove it
// ======================================================
async function createToken({ user_id, token, expires_at }) {
  const tokenHash = hashToken(token);

  const result = await pool.query(
    `
    INSERT INTO PasswordResetTokens (user_id, token, expires_at)
    VALUES ($1, $2, $3)
    RETURNING *;
    `,
    [user_id, tokenHash, expires_at]
  );

  return result.rows[0] || null;
}

// ======================================================
// 🔹 GET TOKEN BY ID
// ======================================================
async function getTokenById(token_id) {
  const result = await pool.query(
    `
    SELECT *
    FROM PasswordResetTokens
    WHERE token_id = $1;
    `,
    [token_id]
  );

  return result.rows[0] || null;
}

// ======================================================
// 🔹 GET TOKEN BY VALUE (FIXED)
// ======================================================
async function getTokenByValue(token) {
  const tokenHash = hashToken(token);

  const result = await pool.query(
    `
    SELECT *
    FROM PasswordResetTokens
    WHERE token = $1
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;
    `,
    [tokenHash]
  );

  return result.rows[0] || null;
}

// ======================================================
// 🔹 GET ALL TOKENS
// ======================================================
async function getAllTokens(user_id = null, limit = 50, offset = 0) {
  const result = await pool.query(
    `
    SELECT *
    FROM PasswordResetTokens
    ${user_id ? "WHERE user_id = $1" : ""}
    ORDER BY created_at DESC
    LIMIT $${user_id ? 2 : 1}
    OFFSET $${user_id ? 3 : 2};
    `,
    user_id ? [user_id, limit, offset] : [limit, offset]
  );

  return result.rows;
}

// ======================================================
// 🔹 UPDATE TOKEN (only expiry allowed)
// ======================================================
async function updateToken(token_id, updates) {
  const allowedFields = ["expires_at"];

  const keys = Object.keys(updates).filter((k) =>
    allowedFields.includes(k)
  );

  if (!keys.length) return null;

  const setClause = keys
    .map((k, i) => `${k} = $${i + 1}`)
    .join(", ");

  const values = keys.map((k) => updates[k]);
  values.push(token_id);

  const result = await pool.query(
    `
    UPDATE PasswordResetTokens
    SET ${setClause}
    WHERE token_id = $${keys.length + 1}
    RETURNING *;
    `,
    values
  );

  return result.rows[0] || null;
}

// ======================================================
// 🔹 DELETE TOKEN
// ======================================================
async function deleteToken(token_id) {
  const result = await pool.query(
    `
    DELETE FROM PasswordResetTokens
    WHERE token_id = $1
    RETURNING *;
    `,
    [token_id]
  );

  return result.rows[0] || null;
}

// ======================================================
// 🔹 DELETE EXPIRED TOKENS
// ======================================================
async function deleteExpiredTokens() {
  const result = await pool.query(
    `
    DELETE FROM PasswordResetTokens
    WHERE expires_at < NOW()
    RETURNING token_id;
    `
  );

  return {
    deleted: result.rowCount || 0,
  };
}

module.exports = {
  createToken,
  getTokenById,
  getTokenByValue,
  getAllTokens,
  updateToken,
  deleteToken,
  deleteExpiredTokens,
};