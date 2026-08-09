// routes/auditLogRoutes.js

const express = require('express');
const router = express.Router();

const auditLogController = require('../controllers/auditLogController.js');

/**
 * ======================================================
 * 🔹 AUDIT LOG ROUTES
 * ======================================================
 */

// Get audit logs (filtered + paginated)
router.get('/', auditLogController.getAuditLogs);

// Update audit log
router.put('/:log_id', auditLogController.updateAuditLog);

// Delete audit logs (bulk delete)
router.delete('/', auditLogController.deleteAuditLogs);

module.exports = router;