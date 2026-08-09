// modules/website_management/routes/connectLinksRoutes.js

const express = require('express');
const router = express.Router();

const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');
const { requireRole } = require('../../../middlewares/roleMiddleware.js');
const controller = require('../controllers/connectLinksController.js');

const requireAdmin = [requireSession, attachUser, requireRole(['admin', 'moderator'])];

// PUBLIC
router.get('/', controller.getEnabledLinks);

// ADMIN
router.get('/all', ...requireAdmin, controller.getAllLinks);
router.put('/:platform', ...requireAdmin, controller.updateLink);

module.exports = router;
