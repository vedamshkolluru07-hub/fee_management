// modules/website_management/routes/enquiryRoutes.js
//
// Public submissions are already covered by the app-wide
// generalLimiter mounted in server.js before all routes.

const express = require('express');
const router = express.Router();

const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');
const { requireRole } = require('../../../middlewares/roleMiddleware.js');
const controller = require('../controllers/enquiryController.js');

const requireAdmin = [requireSession, attachUser, requireRole(['admin', 'moderator'])];

// PUBLIC
router.post('/', controller.submitEnquiry);

// ADMIN
router.get('/', ...requireAdmin, controller.listEnquiries);
router.patch('/:id/status', ...requireAdmin, controller.updateStatus);
router.delete('/:id', ...requireAdmin, controller.deleteEnquiry);

module.exports = router;
