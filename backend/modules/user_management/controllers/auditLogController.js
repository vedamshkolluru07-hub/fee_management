// controllers/auditLogController.js

const auditLogService = require('../services/auditLogService.js');

/**
 * ======================================================
 * 🔹 GET AUDIT LOGS (FILTERED + PAGINATED)
 * ======================================================
 */
async function getAuditLogs(req, res) {
  const filters = req.query || {};

  const result = await auditLogService.getAuditLogsService(filters);

  if (!result.success) {
    return res.status(500).json(result);
  }

  return res.status(200).json(result);
}

/**
 * ======================================================
 * 🔹 UPDATE AUDIT LOG
 * ======================================================
 */
async function updateAuditLog(req, res) {
  const { log_id } = req.params;
  const updates = req.body;

  const result = await auditLogService.updateAuditLogService(log_id, updates);

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.status(200).json(result);
}

/**
 * ======================================================
 * 🔹 DELETE AUDIT LOGS (BULK)
 * ======================================================
 */
async function deleteAuditLogs(req, res) {
  const { logIds } = req.body;

  const result = await auditLogService.deleteAuditLogsService(logIds);

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.status(200).json(result);
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  getAuditLogs,
  updateAuditLog,
  deleteAuditLogs,
};