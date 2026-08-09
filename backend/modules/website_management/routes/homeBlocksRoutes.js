// modules/website_management/routes/homeBlocksRoutes.js

const express = require('express');
const router = express.Router();

const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');
const { requireRole } = require('../../../middlewares/roleMiddleware.js');
const controller = require('../controllers/homeBlocksController.js');

const requireAdmin = [requireSession, attachUser, requireRole(['admin', 'moderator'])];

// --------------------------
// PUBLIC
// --------------------------
router.get('/published', controller.getPublished);

// --------------------------
// ADMIN
// --------------------------
router.get('/draft', ...requireAdmin, controller.getDraft);
router.post('/blocks', ...requireAdmin, controller.createBlock);
router.put('/blocks/:id', ...requireAdmin, controller.updateBlock);
router.delete('/blocks/:id', ...requireAdmin, controller.deleteBlock);
router.post('/publish', ...requireAdmin, controller.publish);
router.post('/discard-draft', ...requireAdmin, controller.discardDraft);

module.exports = router;
