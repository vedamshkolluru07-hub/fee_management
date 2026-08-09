const userService = require('../services/userService.js');

/**
 * -----------------------------------
 * HELPERS
 * -----------------------------------
 */

function sendResponse(res, result, successCode = 200) {
  const status = result?.status
    || (result?.success === false ? 400 : successCode);

  return res.status(status).json(result);
}

// req.user is set by attachUser (fresh DB row, no password_hash) and is
// what authorization decisions should be based on. req.session.user is
// only kept as a fallback for routes that don't run attachUser.
function getActor(req) {
  return req.user || req.session?.user || null;
}

/**
 * -----------------------------------
 * CREATE USERS
 * -----------------------------------
 */

async function createUser(req, res) {
  try {
    const result = await userService.createUser(req.body, getActor(req));
    return sendResponse(res, result, 201);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function createAdmin(req, res) {
  try {
    const result = await userService.createAdmin(req.body, getActor(req));
    return sendResponse(res, result, 201);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * -----------------------------------
 * GET USERS
 * -----------------------------------
 */

async function getUser(req, res) {
  try {
    const { identifier } = req.params;
    const result = await userService.getUser(identifier, getActor(req));
    return sendResponse(res, result);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function getUserById(req, res) {
  try {
    const { userId } = req.params;
    const result = await userService.getUserById(userId, getActor(req));
    return sendResponse(res, result);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function getUserIdByName(req, res) {
  try {
    const { name } = req.query;
    const result = await userService.getUserIdByName(name, getActor(req));

    if (result?.status === 403) {
      return sendResponse(res, result);
    }

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function getUserDetailsByName(req, res) {
  try {
    const { name } = req.query;
    const result = await userService.getUserDetailsByName(name, getActor(req));
    return sendResponse(res, result);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function getAllUsers(req, res) {
  try {
    const filters = {
      excludeUserId: req.query.excludeUserId,
      role: req.query.role,
      search: req.query.search,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined,
      is_approved: req.query.is_approved !== undefined
        ? req.query.is_approved === 'true'
        : undefined,
      can_manage_users: req.query.can_manage_users !== undefined
        ? req.query.can_manage_users === 'true'
        : undefined,
      deleted: req.query.deleted !== undefined
        ? req.query.deleted === 'true'
        : undefined
    };

    const result = await userService.getAllUsers(filters, getActor(req));
    return sendResponse(res, result);

  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * -----------------------------------
 * STATS
 * -----------------------------------
 */

async function getTotalUsersByRole(req, res) {
  try {
    const role = req.query.role || 'user';
    const result = await userService.getTotalUsersByRole(role);
    return sendResponse(res, result);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function getAdminStats(req, res) {
  try {
    const result = await userService.getAdminStats();
    return sendResponse(res, result);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * -----------------------------------
 * UPDATE OPERATIONS (NOTIFICATION READY)
 * -----------------------------------
 */

async function updatePassword(req, res) {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    const result = await userService.updatePassword(
      userId,
      password,
      getActor(req)
    );

    return sendResponse(res, result);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function toggleIsApproved(req, res) {
  try {
    const { userId } = req.params;
    const { value } = req.body;

    const result = await userService.toggleIsApproved(
      userId,
      value,
      getActor(req)
    );

    return sendResponse(res, result);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function toggleCanManageUsers(req, res) {
  try {
    const { userId } = req.params;
    const { value } = req.body;

    const result = await userService.toggleCanManageUsers(
      userId,
      value,
      getActor(req)
    );

    return sendResponse(res, result);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function toggleDeleted(req, res) {
  try {
    const { userId } = req.params;
    const { value } = req.body;

    const result = await userService.toggleDeleted(
      userId,
      value,
      getActor(req)
    );

    return sendResponse(res, result);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function changeUserRole(req, res) {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const result = await userService.changeUserRole(
      userId,
      role,
      getActor(req)
    );

    return sendResponse(res, result);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function updateUserData(req, res) {
  try {
    const { userIds, data } = req.body;

    const result = await userService.updateUserData(
      userIds,
      data,
      getActor(req)
    );

    return sendResponse(res, result);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * -----------------------------------
 * DELETE OPERATIONS (NOTIFICATION READY)
 * -----------------------------------
 */

async function deleteUsers(req, res) {
  try {
    const { userIds } = req.body;

    const result = await userService.deleteUsers(
      userIds,
      getActor(req)
    );

    return sendResponse(res, result);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function softDeleteUsers(req, res) {
  try {
    const { userIds } = req.body;

    const result = await userService.softDeleteUsers(
      userIds,
      getActor(req)
    );

    return sendResponse(res, result);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function deleteUnapprovedUsers(req, res) {
  try {
    const result = await userService.deleteUnapprovedUsers(
      getActor(req)
    );

    return sendResponse(res, result);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function deleteSoftDeletedUsers(req, res) {
  try {
    const result = await userService.deleteSoftDeletedUsers(
      getActor(req)
    );

    return sendResponse(res, result);
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * -----------------------------------
 * EXPORTS
 * -----------------------------------
 */

module.exports = {
  createAdmin,
  createUser,

  getUser,
  getUserById,
  getUserIdByName,
  getUserDetailsByName,
  getAllUsers,

  getTotalUsersByRole,
  getAdminStats,

  updatePassword,
  toggleIsApproved,
  toggleCanManageUsers,
  toggleDeleted,
  changeUserRole,

  updateUserData,

  deleteUsers,
  softDeleteUsers,
  deleteUnapprovedUsers,
  deleteSoftDeletedUsers
};