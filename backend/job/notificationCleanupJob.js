const cron = require('node-cron');
const db = require('../utils/db.js');

/**
 * ======================================================
 * 🔥 DELETE OLD NOTIFICATIONS (45+ DAYS)
 * ======================================================
 */
async function cleanupNotifications() {
  try {
    const result = await db.query(`
      DELETE FROM Notifications
      WHERE created_at <= NOW() - INTERVAL '45 days'
      RETURNING id;
    `);

    console.log(`🧹 Notifications deleted: ${result.rows.length}`);
  } catch (err) {
    console.error('❌ Notification cleanup error:', err.message);
  }
}

/**
 * ======================================================
 * 🔁 RUN EVERY 24 DAYS
 * ======================================================
 */
function startNotificationCleanupJob() {
  cron.schedule('0 0 */24 * *', async () => {
    console.log('🚀 Running notification cleanup job...');
    await cleanupNotifications();
  });

  console.log('✅ Notification cleanup cron scheduled (every 24 days)');
}

module.exports = startNotificationCleanupJob;