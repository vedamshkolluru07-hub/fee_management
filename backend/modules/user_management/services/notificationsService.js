// services/notificationsService.js

const notificationsRepository = require('../repositories/notificationRepository.js');

// ======================================================
// 🔹 VALIDATION HELPERS
// ======================================================
function assertUserId(user_id) {
  if (!user_id) throw new Error('user_id is required');
}

function assertIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('ids must be a non-empty array');
  }
}

// ======================================================
// 🔹 GET NOTIFICATIONS
// ======================================================
async function getNotifications(filters = {}) {
  if (!filters.user_id) {
    throw new Error('user_id is required in filters');
  }

  return await notificationsRepository.getNotifications(filters);
}

// ======================================================
// 🔹 GET UNREAD COUNT
// ======================================================
async function getUnreadCount(user_id) {
  assertUserId(user_id);
  return await notificationsRepository.getUnreadCount(user_id);
}

// ======================================================
// 🔹 MARK MULTIPLE AS READ
// ======================================================
async function markMultipleAsRead(user_id, ids = []) {
  assertUserId(user_id);
  assertIds(ids);
  return await notificationsRepository.markMultipleAsRead(user_id, ids);
}

// ======================================================
// 🔹 DELETE BULK NOTIFICATIONS
// ======================================================
async function deleteBulkNotifications(user_id, ids = []) {
  assertUserId(user_id);
  assertIds(ids);
  return await notificationsRepository.deleteBulkNotifications(user_id, ids);
}

// ======================================================
// 🔹 MARK BY TYPE AS READ
// ======================================================
async function markByTypeAsRead(user_id, type) {
  assertUserId(user_id);
  if (!type) throw new Error('type is required');

  return await notificationsRepository.markByTypeAsRead(user_id, type);
}

// ======================================================
// 🔹 DELETE SINGLE NOTIFICATION
// ======================================================
async function deleteNotification(user_id, notification_id) {
  assertUserId(user_id);
  if (!notification_id) {
    throw new Error('notification_id is required');
  }

  return await notificationsRepository.deleteNotification(user_id, notification_id);
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