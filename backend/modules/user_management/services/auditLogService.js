// services/auditLogService.js

const auditLogRepo = require('../repositories/auditLogRepository.js');

/**
 * ======================================================
 * 🔹 GET AUDIT LOGS (FILTERED + PAGINATED)
 * ======================================================
 */
async function getAuditLogsService(filters = {}) {
  try {
    const result = await auditLogRepo.getAuditLogs(filters);
    return result;
  } catch (err) {
    console.error('❌ getAuditLogsService error:', err.message);
    return {
      success: false,
      message: 'Service error while fetching audit logs',
    };
  }
}

/**
 * ======================================================
 * 🔹 UPDATE AUDIT LOG
 * ======================================================
 */
async function updateAuditLogService(log_id, updates = {}) {
  try {
    if (!log_id) {
      return {
        success: false,
        message: 'log_id is required',
      };
    }

    if (!updates || Object.keys(updates).length === 0) {
      return {
        success: false,
        message: 'No update fields provided',
      };
    }

    const result = await auditLogRepo.updateAuditLog(log_id, updates);
    return result;
  } catch (err) {
    console.error('❌ updateAuditLogService error:', err.message);
    return {
      success: false,
      message: 'Service error while updating audit log',
    };
  }
}

/**
 * ======================================================
 * 🔹 DELETE AUDIT LOGS (BULK)
 * ======================================================
 */
async function deleteAuditLogsService(logIds = []) {
  try {
    if (!Array.isArray(logIds) || logIds.length === 0) {
      return {
        success: false,
        message: 'No log IDs provided',
      };
    }

    const result = await auditLogRepo.deleteAuditLogs(logIds);
    return result;
  } catch (err) {
    console.error('❌ deleteAuditLogsService error:', err.message);
    return {
      success: false,
      message: 'Service error while deleting audit logs',
    };
  }
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  getAuditLogsService,
  updateAuditLogService,
  deleteAuditLogsService,
};