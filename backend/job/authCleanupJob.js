// jobs/authCleanupJob.js

const cron = require('node-cron');
const db = require('../utils/db.js');

/**
 * ======================================================
 * 🔥 DELETE OLD OTP + PASSWORD RESET TOKENS
 * ======================================================
 */
async function cleanupAuthTokens() {
  try {
    // Delete expired password reset tokens
    const resetResult = await db.query(`
      DELETE FROM PasswordResetTokens
      WHERE created_at <= NOW() - INTERVAL '5 days'
      RETURNING token_id;
    `);

    // Delete expired OTP requests
    const otpResult = await db.query(`
      DELETE FROM OTPRequests
      WHERE created_at <= NOW() - INTERVAL '5 days'
      RETURNING otp_id;
    `);

    console.log(
      `🧹 Auth Cleanup:
      - PasswordResetTokens deleted: ${resetResult.rows.length}
      - OTPRequests deleted: ${otpResult.rows.length}`
    );
  } catch (err) {
    console.error('❌ Auth cleanup job error:', err.message);
  }
}

/**
 * ======================================================
 * 🔁 RUN EVERY 3 DAYS
 * ======================================================
 */
function startAuthCleanupJob() {
  // Every 3 days at 00:00
  cron.schedule('0 0 */3 * *', async () => {
    console.log('🚀 Running auth cleanup job...');
    await cleanupAuthTokens();
  });

  console.log('✅ Auth cleanup cron job scheduled (every 3 days)');
}

module.exports = startAuthCleanupJob;