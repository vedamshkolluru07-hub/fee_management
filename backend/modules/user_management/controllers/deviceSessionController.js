// controllers/deviceSessionController.js

const sessionService = require('../services/deviceSessionService.js');

/**
 * ======================================================
 * 🔹 GET SESSIONS CONTROLLER
 * ======================================================
 */
async function getSessionsController(req, res) {
  try {
    const { user_id, name, limit, offset } = req.query;

    const result = await sessionService.getSessionsService(
      {
        user_id: user_id ? Number(user_id) : undefined,
        name,
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0,
      },
      req.user
    );

    if (!result.success) {
      return res.status(result.status || 400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ getSessionsController error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * ======================================================
 * 🔹 DELETE SESSION CONTROLLER
 * ======================================================
 */
async function deleteSessionController(req, res) {
  try {
    const { user_id, name, date } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'date is required',
      });
    }

    const result = await sessionService.deleteSessionService(
      {
        user_id: user_id ? Number(user_id) : undefined,
        name,
        date,
      },
      req.user
    );

    if (!result.success) {
      return res.status(result.status || 400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('❌ deleteSessionController error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  getSessionsController,
  deleteSessionController,
};