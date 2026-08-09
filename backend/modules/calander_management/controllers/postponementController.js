// controllers/postponementController.js

const postponementService = require('../services/postponmentService.js');

// ======================================================
// POSTPONE EVENT
// ======================================================
exports.postponeEvent = async (req, res) => {
  try {
    const actor_user_id = req.user?.user_id;

    if (!actor_user_id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized user',
      });
    }

    const { event_id } = req.params;
    const { new_start_time, reason } = req.body;


    const result = await postponementService.postponeEvent(
      event_id,
      new_start_time,
      reason,
      actor_user_id
    );


    return res
      .status(result?.success ? 200 : 400)
      .json(result);


  } catch (error) {
    console.error('[Postpone Controller Error]:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ======================================================
// GET POSTPONEMENT HISTORY
// ======================================================
exports.getPostponementHistory = async (req, res) => {
  try {
    const { event_id } = req.params;

    const result = await postponementService.getPostponementHistory(event_id);

    return res.status(result?.success ? 200 : 400).json(result);

  } catch (error) {
    console.error('[History Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ======================================================
// CLEANUP OLD RESCHEDULE RECORDS
// ======================================================
exports.cleanupOldReschedules = async (req, res) => {
  try {
    const { days } = req.query;

    const result = await postponementService.cleanupOldReschedules(days);

    return res.status(result?.success ? 200 : 400).json(result);

  } catch (error) {
    console.error('[Cleanup Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};