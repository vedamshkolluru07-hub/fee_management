// jobs/userCleanupJob.js

const cron = require('node-cron');
const db = require('../utils/db.js');

/**
 * ======================================================
 * 🔥 DELETE UNAPPROVED USERS OLDER THAN 15 DAYS
 * ======================================================
 */
async function deleteOldUnapprovedUsers() {
  try {
    const result = await db.query(`
      DELETE FROM Users
      WHERE is_approved = FALSE
        AND created_at <= NOW() - INTERVAL '15 days'
      RETURNING user_id;
    `);

    console.log(
      `🧹 Cleanup Job: Deleted ${result.rows.length} unapproved users`
    );
  } catch (err) {
    console.error('❌ Cleanup job error:', err.message);
  }
}

/**
 * ======================================================
 * 🔁 CRON SCHEDULER (EVERY 8 DAYS)
 * ======================================================
 */
function startUserCleanupJob() {
  // Runs every 8 days at 00:00
  cron.schedule('0 0 */8 * *', async () => {
    console.log('🚀 Running user cleanup job...');
    await deleteOldUnapprovedUsers();
  });

  console.log('✅ User cleanup cron job scheduled (every 8 days)');
}

module.exports = startUserCleanupJob;