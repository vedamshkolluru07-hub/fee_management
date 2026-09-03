// controllers/calendarController.js

const calendarService = require('../services/calendarService.js');


// ======================================================
// CREATE EVENT
// ======================================================
exports.createEvent = async (req, res) => {
  try {
    const actor_user_id = req.user?.user_id;

    if (!actor_user_id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized user',
      });
    }

    const result = await calendarService.createEvent(
      req.body,
      actor_user_id
    );

    return res.status(result?.success ? 201 : 400).json(result);

  } catch (error) {
    console.error('[Controller createEvent Error]:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


// ======================================================
// GET EVENTS
// ======================================================
exports.getEvents = async (req, res) => {
  try {
    const role = req.user?.role || 'user';
    const result = await calendarService.getEvents({ ...req.query, role });

    return res.status(result?.success ? 200 : 400).json(result);

  } catch (error) {
    console.error('[Controller getEvents Error]:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


// ======================================================
// GET EVENT BY ID
// ======================================================
exports.getEventById = async (req, res) => {
  try {
    const result = await calendarService.getEventById(
      req.params.event_id
    );

    return res.status(result?.success ? 200 : 404).json(result);

  } catch (error) {
    console.error('[Controller getEventById Error]:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


// ======================================================
// UPCOMING 15 DAYS EVENTS
// ======================================================
exports.getUpcoming15DayEvents = async (req, res) => {
  try {
    const result = await calendarService.getUpcoming15DayEvents();

    return res.status(result?.success ? 200 : 400).json(result);

  } catch (error) {
    console.error('[Controller upcoming15Days Error]:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


// ======================================================
// LOGIN ALERT EVENTS
// ======================================================
exports.getLoginAlertEvents = async (req, res) => {
  try {
    const result = await calendarService.getLoginAlertEvents();

    return res.status(result?.success ? 200 : 400).json(result);

  } catch (error) {
    console.error('[Controller loginAlert Error]:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


// ======================================================
// RECENT COMPLETED EVENT
// ======================================================
exports.getRecentCompletedEvent = async (req, res) => {
  try {
    const result = await calendarService.getRecentCompletedEvent();

    // "no completed event yet" is not an error — always 200
    return res.status(200).json(result);

  } catch (error) {
    console.error('[Controller recentCompleted Error]:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


// ======================================================
// UPDATE EVENT
// ======================================================
exports.updateEvent = async (req, res) => {
  try {
    const actor_user_id = req.user?.user_id;

    if (!actor_user_id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized user',
      });
    }

    const result = await calendarService.updateEvent(
      req.params.event_id,
      req.body,
      actor_user_id
    );

    return res.status(result?.success ? 200 : 400).json(result);

  } catch (error) {
    console.error('[Controller updateEvent Error]:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


// ======================================================
// DELETE EVENT
// ======================================================
exports.deleteEvent = async (req, res) => {
  try {
    const actor_user_id = req.user?.user_id;

    if (!actor_user_id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized user',
      });
    }

    const result = await calendarService.deleteEvent(
      req.params.event_id,
      actor_user_id
    );

    return res.status(result?.success ? 200 : 400).json(result);

  } catch (error) {
    console.error('[Controller deleteEvent Error]:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


// ======================================================
// BULK DELETE EVENTS
// ======================================================
exports.deleteBulk = async (req, res) => {
  try {
    const actor_user_id = req.user?.user_id;

    if (!actor_user_id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized user',
      });
    }

    const result = await calendarService.deleteBulk(
      req.body.eventIds,
      actor_user_id
    );

    return res.status(result?.success ? 200 : 400).json(result);

  } catch (error) {
    console.error('[Controller deleteBulk Error]:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};