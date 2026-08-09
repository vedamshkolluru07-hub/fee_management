// modules/website_management/routes/enquiryTypeRoutes.js

const express = require('express');
const router = express.Router();

const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');
const { requireRole } = require('../../../middlewares/roleMiddleware.js');
const controller = require('../controllers/enquiryTypeController.js');

const requireAdmin = [requireSession, attachUser, requireRole(['admin', 'moderator'])];

// PUBLIC
router.get('/', controller.getActiveTypes);

// ADMIN
router.get('/all', ...requireAdmin, controller.getAllTypes);
router.post('/', ...requireAdmin, controller.createType);
router.put('/:id', ...requireAdmin, controller.updateType);

module.exports = router;
