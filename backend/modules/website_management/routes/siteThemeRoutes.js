// modules/website_management/routes/siteThemeRoutes.js

const express = require('express');
const router = express.Router();

const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');
const { requireRole } = require('../../../middlewares/roleMiddleware.js');
const controller = require('../controllers/siteThemeController.js');

const requireAdmin = [requireSession, attachUser, requireRole(['admin', 'moderator'])];

// PUBLIC
router.get('/', controller.getTheme);

// ADMIN
router.put('/', ...requireAdmin, controller.updateTheme);

module.exports = router;
