const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController.js');
const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');
const { requireRole, requireUserManagement } = require('../../../middlewares/roleMiddleware.js');

/**
 * -----------------------------------
 * CREATE USERS
 * create-user: public self-registration (stays unapproved until admin
 * approves it — see toggle-is-approved).
 * create-admin: SECURITY FIX — this used to have no auth at all, meaning
 * anyone could create their own admin account. Now admin-only.
 * -----------------------------------
 */

router.post('/create-user', userController.createUser);

router.post(
  '/create-admin',
  requireSession,
  attachUser,
  requireRole(['admin']),
  userController.createAdmin
);

/**
 * -----------------------------------
 * GET USERS
 * SECURITY FIX — these had no auth at all before. All now require a
 * resolved session user; the actual "admin sees everyone / user sees
 * only self" scoping happens inside userService using req.user.
 * -----------------------------------
 */

router.get(
  '/get-user/:identifier',
  requireSession,
  attachUser,
  userController.getUser
);

router.get(
  '/get-user-by-id/:userId',
  requireSession,
  attachUser,
  userController.getUserById
);

// Free-text search across all users' names — only meaningful/safe for
// staff who are allowed to browse the directory, not a plain user.
router.get(
  '/get-user-id-by-name',
  requireSession,
  attachUser,
  requireUserManagement,
  userController.getUserIdByName
);

router.get(
  '/get-user-details-by-name',
  requireSession,
  attachUser,
  requireUserManagement,
  userController.getUserDetailsByName
);

router.get(
  '/get-all-users',
  requireSession,
  attachUser,
  userController.getAllUsers
);

/**
 * -----------------------------------
 * STATS
 * Aggregate counts about the user base — restricted to staff who manage
 * users / admins, not exposed to every logged-in user.
 * -----------------------------------
 */

router.get(
  '/get-total-users-by-role',
  requireSession,
  attachUser,
  requireUserManagement,
  userController.getTotalUsersByRole
);

router.get(
  '/get-admin-stats',
  requireSession,
  attachUser,
  requireRole(['admin']),
  userController.getAdminStats
);

/**
 * -----------------------------------
 * UPDATE OPERATIONS
 * requireSession -> attachUser -> requireRole/permission -> controller
 * -----------------------------------
 */

// SECURITY FIX: previously any logged-in user could reset ANY other
// user's password by passing a different :userId. Ownership/permission
// is now enforced inside userService.updatePassword.
router.patch(
  '/update-password/:userId',
  requireSession,
  attachUser,
  userController.updatePassword
);

router.patch(
  '/toggle-is-approved/:userId',
  requireSession,
  attachUser,
  requireUserManagement,
  userController.toggleIsApproved
);

router.patch(
  '/toggle-can-manage-users/:userId',
  requireSession,
  attachUser,
  requireRole(['admin']),
  userController.toggleCanManageUsers
);

router.patch(
  '/toggle-deleted/:userId',
  requireSession,
  attachUser,
  requireUserManagement,
  userController.toggleDeleted
);

router.patch(
  '/change-user-role/:userId',
  requireSession,
  attachUser,
  requireRole(['admin']),
  userController.changeUserRole
);

// SECURITY FIX: this was the main privilege-escalation hole — any
// logged-in user could PATCH their own role/can_manage_users/is_approved
// via this endpoint. userService now restricts non-privileged actors to
// their own record and a safe field allowlist (no role/permission/flag
// fields).
router.patch(
  '/update-user-data',
  requireSession,
  attachUser,
  userController.updateUserData
);

/**
 * -----------------------------------
 * DELETE OPERATIONS
 * -----------------------------------
 */

router.delete(
  '/delete-users',
  requireSession,
  attachUser,
  requireUserManagement,
  userController.deleteUsers
);

router.patch(
  '/soft-delete-users',
  requireSession,
  attachUser,
  requireUserManagement,
  userController.softDeleteUsers
);

router.delete(
  '/delete-unapproved-users',
  requireSession,
  attachUser,
  requireRole(['admin']),
  userController.deleteUnapprovedUsers
);

router.delete(
  '/delete-soft-deleted-users',
  requireSession,
  attachUser,
  requireRole(['admin']),
  userController.deleteSoftDeletedUsers
);

/**
 * -----------------------------------
 * EXPORTS
 * -----------------------------------
 */

module.exports = router;