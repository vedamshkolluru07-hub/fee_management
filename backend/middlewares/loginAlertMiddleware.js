// middlewares/loginAlertMiddleware.js

const calendarRepository = require('../modules/calander_management/repositories/calanderRepository.js');

/**
 * LOGIN ALERT MIDDLEWARE
 * -----------------------------------------
 * Attaches upcoming calendar alerts to the request object.
 * Must run AFTER requireSession (reads req.session.user, since req.user
 * may not be populated yet at this point in the chain).
 * Mount it only on routes that need it — it was never wired in before.
 */

module.exports = async function loginAlertMiddleware(req, res, next) {
  try {
    const user_id = req.session?.user?.user_id;

    if (!user_id) {
      req.loginAlerts = [];
      return next();
    }

    const result = await calendarRepository.getLoginAlertEvents();
    const events = result?.data || [];

    if (!Array.isArray(events) || events.length === 0) {
      req.loginAlerts = [];
      return next();
    }

    req.loginAlerts = events.map((event) => ({
      user_id,
      event_id: event.event_id,
      title: `🚨 ${event.title || 'Untitled Event'}`,
      message: event.start_time
        ? `Scheduled at ${event.start_time}`
        : 'Scheduled event',
      type: 'login_alert',
      is_postponed: !!event.is_postponed,
      postponed_from: event.postponed_from || null,
    }));

    return next();
  } catch (err) {
    console.error('❌ [LoginAlertMiddleware] Error:', err);

    req.loginAlerts = [];
    return next();
  }
};