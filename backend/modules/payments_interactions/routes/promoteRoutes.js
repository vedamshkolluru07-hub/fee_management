const express = require('express');
const router = express.Router();
const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachUser.js');
const { promoteStudentsController } = require('../controllers/promoteController.js');

// ================= PROMOTION ROUTE =================
router.post('/promote-students', requireSession, attachUser, promoteStudentsController);

module.exports = router;