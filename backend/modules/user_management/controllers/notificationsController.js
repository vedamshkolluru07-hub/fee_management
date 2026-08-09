// controllers/notificationsController.js

const notificationsService = require('../services/notificationsService.js');

// ======================================================
// 🔹 GET NOTIFICATIONS
// ======================================================
async function getNotifications(req, res) {
  try {
    const filters = {
      user_id: req.user.user_id,
      type: req.query.type,
      read: req.query.read !== undefined ? req.query.read === 'true' : null,
      search: req.query.search,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
    };

    const data = await notificationsService.getNotifications(filters);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

// ======================================================
// 🔹 GET UNREAD COUNT
// ======================================================
async function getUnreadCount(req, res) {
  try {
    const user_id = req.user.user_id;

    const count = await notificationsService.getUnreadCount(user_id);

    return res.status(200).json({
      success: true,
      unread_count: count,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

// ======================================================
// 🔹 MARK MULTIPLE AS READ
// ======================================================
async function markMultipleAsRead(req, res) {
  try {
    const { ids } = req.body;
    const user_id = req.user.user_id;

    const result = await notificationsService.markMultipleAsRead(user_id, ids);

    return res.status(200).json({
      success: true,
      updated: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

// ======================================================
// 🔹 DELETE BULK NOTIFICATIONS
// ======================================================
async function deleteBulkNotifications(req, res) {
  try {
    const { ids } = req.body;
    const user_id = req.user.user_id;

    const result = await notificationsService.deleteBulkNotifications(user_id, ids);

    return res.status(200).json({
      success: true,
      deleted: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

// ======================================================
// 🔹 MARK BY TYPE AS READ
// ======================================================
async function markByTypeAsRead(req, res) {
  try {
    const { type } = req.body;
    const user_id = req.user.user_id;

    const result = await notificationsService.markByTypeAsRead(user_id, type);

    return res.status(200).json({
      success: true,
      updated: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

// ======================================================
// 🔹 DELETE SINGLE NOTIFICATION
// ======================================================
async function deleteNotification(req, res) {
  try {
    const { notification_id } = req.params;
    const user_id = req.user.user_id;

    const result = await notificationsService.deleteNotification(user_id, notification_id);

    return res.status(200).json({
      success: true,
      deleted: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

// ======================================================
// 🔹 EXPORTS
// ======================================================
module.exports = {
  getNotifications,
  getUnreadCount,
  markMultipleAsRead,
  deleteBulkNotifications,
  markByTypeAsRead,
  deleteNotification,
};