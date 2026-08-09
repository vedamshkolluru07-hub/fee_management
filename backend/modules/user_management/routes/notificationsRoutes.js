// routes/notificationsRoutes.js

const express = require('express');
const router = express.Router();
const attachUser = require('../../../middlewares/attachuser.js');
const notificationsController = require('../controllers/notificationsController.js');

const { requireSession } = require('../../../middlewares/sessionMiddleware.js');

router.get('/', requireSession, attachUser, notificationsController.getNotifications);
router.get('/unread-count', requireSession, attachUser, notificationsController.getUnreadCount);
router.patch('/mark-read', requireSession, attachUser, notificationsController.markMultipleAsRead);
router.patch('/mark-by-type', requireSession, attachUser, notificationsController.markByTypeAsRead);
router.delete('/bulk', requireSession, attachUser, notificationsController.deleteBulkNotifications);
router.delete('/:notification_id', requireSession, attachUser, notificationsController.deleteNotification);

module.exports = router;