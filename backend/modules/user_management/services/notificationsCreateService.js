
// services/notificationsCreateService.js

const notificationsRepo = require('../repositories/notificationRepository.js');

/**
 * ======================================================
 * 🔹 SINGLE NOTIFICATION
 * ======================================================
 */
async function notifyUser({
  user_id,
  title,
  message,
  type = 'info',
}) {
  if (!user_id) throw new Error('user_id is required');

  return await notificationsRepo.createNotification({
    user_id,
    title,
    message,
    type,
  });
}

/**
 * ======================================================
 * 🔹 BULK NOTIFICATIONS
 * ======================================================
 */
async function notifyUsers(notifications = []) {
  if (!Array.isArray(notifications) || !notifications.length) {
    return [];
  }

  return await notificationsRepo.createBulkNotifications(
    notifications
  );
}

/**
 * ======================================================
 * 🔹 USER ACTION NOTIFIER (CORE LOGIC)
 * ======================================================
 * This is the main helper you will use in user service.
 * It automatically builds notifications based on action.
 */
async function notifyUserAction({
  actor,        // session user (req.session.user)
  targetUsers,  // affected user(s)
  action,       // e.g: update_password, role_change, delete, approve
  metadata = {}, // extra data if needed
}) {
  if (!actor || !action) {
    throw new Error('actor and action are required');
  }

  const users = Array.isArray(targetUsers)
    ? targetUsers
    : [targetUsers];

  const notifications = [];

  for (const userId of users) {
    let title = '';
    let message = '';

    switch (action) {
      case 'update_password':
        title = 'Password Updated';
        message = `Your password was updated by ${actor.username}`;
        break;

      case 'toggle_is_approved':
        title = 'Approval Status Changed';
        message = `Your approval status was updated by ${actor.username}`;
        break;

      case 'toggle_deleted':
        title = 'Account Status Updated';
        message = `Your account status was changed by ${actor.username}`;
        break;

      case 'role_change':
        title = 'Role Updated';
        message = `Your role was changed to ${metadata.role} by ${actor.username}`;
        break;

      case 'update_user_data':
        title = 'Profile Updated';
        message = `Your profile information was updated by ${actor.username}`;
        break;

      case 'delete_user':
        title = 'Account Deleted';
        message = `Your account was deleted by ${actor.username}`;
        break;

      case 'soft_delete_user':
        title = 'Account Deactivated';
        message = `Your account was deactivated by ${actor.username}`;
        break;

      default:
        title = 'Account Updated';
        message = `Your account was updated by ${actor.username}`;
    }

    notifications.push({
      user_id: userId,
      title,
      message,
      type: 'info',
    });
  }

  return await notificationsRepo.createBulkNotifications(
    notifications
  );
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  notifyUser,
  notifyUsers,
  notifyUserAction,
};