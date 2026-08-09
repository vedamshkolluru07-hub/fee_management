// modules/website_management/routes/uploadRoutes.js

const express = require('express');
const router = express.Router();

const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');
const { requireRole } = require('../../../middlewares/roleMiddleware.js');
const upload = require('../../../config/multerMemory.js');
const controller = require('../controllers/uploadController.js');

const requireAdmin = [requireSession, attachUser, requireRole(['admin', 'moderator'])];

// ADMIN — multipart/form-data, field name "images" (up to 10 files)
router.post('/images', ...requireAdmin, upload.array('images', 10), controller.uploadImages);

module.exports = router;
