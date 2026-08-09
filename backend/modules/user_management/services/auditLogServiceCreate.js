const auditLogRepo = require('../repositories/auditLogRepository.js');
const userRepo = require('../repositories/userRepository.js');

/**
 * ======================================================
 * 🔹 BASE AUDIT LOGGER (CORE FUNCTION)
 * ======================================================
 */
async function createAuditLogService({
  actor_user_id,
  action,
  category,
  log_message,
  target_user_id = null,
  target_entity_type = 'user',
  changes = null,
  success = true,
  severity = 'info',
}) {
  try {
    // OPTIONAL: enrich actor data (safe fallback)
    let actorRole = null;

    if (actor_user_id) {
      const userRes = await userRepo.getUserById(actor_user_id);
      if (userRes.success) {
        actorRole = userRes.data.role;
      }
    }

    const result = await auditLogRepo.createAuditLog({
      actor_user_id,
      action,
      role_at_time: actorRole,
      category,
      log_message,
      target_user_id,
      target_entity_type,
      changes,
      success,
      severity,
    });

    return result;
  } catch (err) {
    console.error('❌ audit service error:', err.message);
    return { success: false, message: 'Audit log service failed' };
  }
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  createAuditLogService,
};