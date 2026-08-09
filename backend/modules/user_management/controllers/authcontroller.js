// controllers/authController.js

const authService = require('../services/authService.js');

/**
 * ======================================================
 * 🔍 DEBUG LOGGER (helper)
 * ======================================================
 */
function logDebug(label, data) {
  console.log(`\n🔵 [AUTH DEBUG] ${label}`);
  console.log(JSON.stringify(data, null, 2));
}

/**
 * ======================================================
 * 🔐 LOGIN CONTROLLER
 * ======================================================
 */
async function login(req, res) {
  try {
    logDebug("LOGIN REQUEST BODY", req.body);

    const { identifier, password, device_info } = req.body;

    if (!identifier || !password) {
      logDebug("LOGIN VALIDATION FAILED", { identifier, password });
      return res.status(400).json({
        success: false,
        message: "identifier and password are required",
      });
    }

    const result = await authService.login({
      identifier,
      password,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
      device_info,
    });

    logDebug("LOGIN SERVICE RESULT", result);

    if (!result.success) {
      return res.status(400).json(result);
    }

  // Create session
  req.session.user = {
    user_id: result.data.user_id,
    username: result.data.username,
    role: result.data.role,
    can_manage_users: result.data.can_manage_users,
    is_approved: result.data.is_approved,
  };

  logDebug("SESSION CREATED", req.session.user);


    return res.status(200).json(result);

  } catch (err) {
    console.error("❌ login controller error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * ======================================================
 * 🔓 LOGOUT CONTROLLER
 * ======================================================
 */
async function logout(req, res) {
  try {
    logDebug("LOGOUT SESSION", req.session?.user);

    const sessionUser = req.session?.user;

    if (!sessionUser) {
      return res.status(401).json({
        success: false,
        message: "No active session found",
      });
    }

    const result = await authService.logout({
      user_id: sessionUser.user_id,
      endTime: new Date().toISOString(),
    });

    logDebug("LOGOUT SERVICE RESULT", result);

    req.session.destroy((err) => {
      if (err) {
        console.error("❌ session destroy error:", err);

        return res.status(500).json({
          success: false,
          message: "Failed to destroy session",
        });
      }

      logDebug("SESSION DESTROYED", { user_id: sessionUser.user_id });

      return res.status(200).json(result);
    });

  } catch (err) {
    console.error("❌ logout controller error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * ======================================================
 * 🔹 CREATE USER CONTROLLER
 * ======================================================
 */
async function createUser(req, res) {
  try {
    logDebug("CREATE USER REQUEST", req.body);

    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Request body is required",
      });
    }

    const result = await authService.createUserService(req.body);

    logDebug("CREATE USER RESULT", result);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(201).json(result);

  } catch (err) {
    console.error("❌ createUser controller error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * ======================================================
 * 🔹 CREATE ADMIN CONTROLLER
 * ======================================================
 */
async function createAdmin(req, res) {
  try {
    logDebug("CREATE ADMIN REQUEST", req.body);

    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Request body is required",
      });
    }

    const result = await authService.createAdminService(req.body);

    logDebug("CREATE ADMIN RESULT", result);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(201).json(result);

  } catch (err) {
    console.error("❌ createAdmin controller error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  login,
  logout,
  createUser,
  createAdmin,
};