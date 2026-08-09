// services/calendarReminderService.js

const calendarRepository = require('../repositories/calanderRepository.js');
const notificationsRepository = require('../../user_management/repositories/notificationRepository.js');

// ======================================================
// REMINDER STAGES
// ======================================================
const STAGES = [
  { days: 15, label: '15 days left' },
  { days: 10, label: '10 days left' },
  { days: 5, label: '5 days left' },
  { days: 1, label: '1 day left' },
  { days: 0, label: 'Today' },
];

// ======================================================
// GET REMINDER STAGE
// ======================================================
function getReminderStage(eventDate) {
  const now = new Date();

  const diffTime =
    new Date(eventDate).getTime() - now.getTime();

  const diffDays = Math.ceil(
    diffTime / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return null;

  for (const stage of STAGES) {
    if (diffDays >= stage.days) {
      return stage;
    }
  }

  return STAGES[STAGES.length - 1];
}

// ======================================================
// BUILD MESSAGE
// ======================================================
function buildMessage(event, stage) {
  return `
📅 Event: ${event.title}

⏳ ${stage.label}
📆 Date: ${new Date(event.start_time).toLocaleString()}

${event.description ? `📝 ${event.description}` : ''}
  `.trim();
}

// ======================================================
// MAIN SERVICE
// ======================================================
async function generateCalendarReminders(io) {
  try {

    // ======================================================
    // GET UPCOMING EVENTS
    // ======================================================
    const result =
      await calendarRepository.getUpcoming15DayEvents();

    const events = result?.data || [];

    if (!events.length) {
      return {
        success: true,
        message: 'No upcoming events',
      };
    }

    let processed = 0;

    // ======================================================
    // PROCESS EVENTS
    // ======================================================
    for (const event of events) {

      if (
        !event?.event_id ||
        !event?.created_by ||
        !event?.start_time
      ) {
        continue;
      }

      const stage = getReminderStage(event.start_time);

      if (!stage) continue;

      const notificationPayload = {
        user_id: event.created_by,
        event_id: event.event_id,
        title: `📅 ${event.title} (${stage.label})`,
        message: buildMessage(event, stage),
        type: 'calendar',
        reminder_stage: stage.days,
      };

      try {

        // ======================================================
        // CHECK EXISTING NOTIFICATION
        // ======================================================
        const existing =
          await notificationsRepository.getNotificationByEventAndStage(
            notificationPayload.event_id,
            notificationPayload.user_id,
            notificationPayload.reminder_stage
          );

        let savedNotification = null;

        // ======================================================
        // UPDATE EXISTING
        // ======================================================
        if (existing) {

          savedNotification =
            await notificationsRepository.updateNotification(
              existing.id,
              {
                title: notificationPayload.title,
                message: notificationPayload.message,
                read: false,
                updated_at: new Date(),
              }
            );

        } else {

          // ======================================================
          // CREATE NEW
          // ======================================================
          savedNotification =
            await notificationsRepository.createNotification(
              notificationPayload
            );
        }

        // ======================================================
        // REALTIME SOCKET EMIT
        // ======================================================
        if (io) {

          // emit to specific user room
          io.to(`user_${event.created_by}`).emit(
            'calendarReminder',
            {
              event_id: event.event_id,
              title: notificationPayload.title,
              message: notificationPayload.message,
              reminder_stage: stage.days,
              start_time: event.start_time,
            }
          );
        }

        processed++;

      } catch (err) {
        console.error(
          '[Notification Processing Error]:',
          err
        );
      }
    }

    return {
      success: true,
      message: `Processed ${processed} reminders`,
    };

  } catch (error) {

    console.error(
      '[Calendar Reminder Service Error]:',
      error
    );

    return {
      success: false,
      message: 'Failed to generate reminders',
    };
  }
}

module.exports = {
  generateCalendarReminders,
};