const cron = require('node-cron');
const db = require('../utils/db.js');

/**
 * ======================================================
 * 🔥 DELETE OLD LOGIN ATTEMPTS (30+ DAYS)
 * ======================================================
 */
async function cleanupLoginAttempts() {
  try {
    const result = await db.query(`
      DELETE FROM LoginAttempts
      WHERE attempted_at <= NOW() - INTERVAL '30 days'
      RETURNING attempt_id;
    `);

    console.log(`🧹 LoginAttempts deleted: ${result.rows.length}`);
  } catch (err) {
    console.error('❌ LoginAttempts cleanup error:', err.message);
  }
}

/**
 * ======================================================
 * 🔁 RUN EVERY 15 DAYS
 * ======================================================
 */
function startLoginAttemptsCleanupJob() {
  cron.schedule('0 0 */15 * *', async () => {
    console.log('🚀 Running login attempts cleanup job...');
    await cleanupLoginAttempts();
  });

  console.log('✅ LoginAttempts cleanup scheduled (every 15 days)');
}

module.exports = startLoginAttemptsCleanupJob;