// services/postponementService.js

const db = require('../../../utils/db');
const calendarRepository = require('../repositories/calanderRepository.js');
const { generateCalendarReminders } = require('./calendarReminderService');
const {
  createAuditLogService
} = require('../../user_management/services/auditLogServiceCreate.js');
// ================= VALIDATION =================
const isValidId = (id) => id !== undefined && id !== null;
const isValidString = (val) => typeof val === 'string' && val.trim().length > 0;

const postponementService = {

  // ======================================================
  // POSTPONE EVENT (SAFE FLOW)
  // ======================================================
  async postponeEvent(
    event_id,
    new_start_time,
    reason = null,
    actor_user_id = null
  ) {
    try {
      if (!isValidId(event_id) || !isValidString(new_start_time)) {
        return {
          success: false,
          message: 'event_id and new_start_time are required',
        };
      }


      // ======================================================
      // 1. GET EXISTING EVENT
      // ======================================================
      const eventResult = await calendarRepository.getEventById(event_id);

      if (!eventResult?.success || !eventResult?.data) {

        await createAuditLogService({
          actor_user_id,
          action: 'POSTPONE_EVENT',
          category: 'update',
          log_message: `Failed to postpone event (${event_id}) because event was not found.`,
          target_entity_type: 'calendar',
          changes: {
            event_id,
            requested_new_start_time: new_start_time,
          },
          success: false,
          severity: 'warning',
        });

        return {
          success: false,
          message: 'Event not found',
        };
      }


      const oldEvent = eventResult.data;


      // ======================================================
      // 2. UPDATE EVENT
      // ======================================================
      const updated = await calendarRepository.updateEvent(
        event_id,
        {
          start_time: new_start_time,
          is_postponed: true,
          postponed_from: oldEvent.start_time,
        }
      );


      if (!updated?.success) {

        await createAuditLogService({
          actor_user_id,
          action: 'POSTPONE_EVENT',
          category: 'update',
          log_message: `Failed to postpone event (${event_id}).`,
          target_entity_type: 'calendar',
          changes: {
            event_id,
            old_start_time: oldEvent.start_time,
            requested_new_start_time: new_start_time,
            reason,
          },
          success: false,
          severity: 'warning',
        });

        return {
          success: false,
          message: 'Failed to postpone event',
        };
      }



      // ======================================================
      // 3. SAVE RESCHEDULE HISTORY
      // ======================================================
      await db.query(
        `
        INSERT INTO EventReschedules (
          event_id,
          old_start_time,
          new_start_time,
          reason,
          created_at
        )
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        `,
        [
          event_id,
          oldEvent.start_time,
          new_start_time,
          reason,
        ]
      );



      // ======================================================
      // 4. INVALIDATE OLD NOTIFICATIONS
      // ======================================================
      await db.query(
        `
        UPDATE Notifications
        SET read = TRUE,
            read_at = CURRENT_TIMESTAMP
        WHERE event_id = $1
        `,
        [event_id]
      );



      // ======================================================
      // 5. REGENERATE REMINDERS
      // ======================================================
      await generateCalendarReminders();



      // ======================================================
      // 6. CREATE AUDIT LOG
      // ======================================================
      await createAuditLogService({
        actor_user_id,
        action: 'POSTPONE_EVENT',
        category: 'update',
        log_message: `Postponed calendar event (${event_id}).`,
        target_entity_type: 'calendar',
        changes: {
          event_id,
          old_start_time: oldEvent.start_time,
          new_start_time,
          reason,
          is_postponed: true,
        },
        success: true,
        severity: 'info',
      });



      return {
        success: true,
        message: 'Event postponed successfully',
        data: updated.data,
      };


    } catch (error) {

      console.error('[PostponementService Error]:', error);


      await createAuditLogService({
        actor_user_id,
        action: 'POSTPONE_EVENT',
        category: 'update',
        log_message: `Error postponing event (${event_id}): ${error.message}`,
        target_entity_type: 'calendar',
        changes: {
          event_id,
          new_start_time,
          reason,
          error: error.message,
        },
        success: false,
        severity: 'critical',
      });


      return {
        success: false,
        message: 'Failed to postpone event',
      };
    }
  },

  // ======================================================
  // GET POSTPONEMENT HISTORY
  // ======================================================
  async getPostponementHistory(event_id) {
    try {
      if (!isValidId(event_id)) {
        return {
          success: false,
          message: 'event_id is required',
        };
      }

      const result = await db.query(
        `
        SELECT *
        FROM EventReschedules
        WHERE event_id = $1
        ORDER BY created_at DESC
        `,
        [event_id]
      );

      return {
        success: true,
        data: result?.rows || [],
      };

    } catch (error) {
      console.error('[PostponementHistory Error]:', error);
      return {
        success: false,
        message: 'Failed to fetch postponement history',
      };
    }
  },

  // ======================================================
  // CLEANUP OLD RESCHEDULE RECORDS
  // ======================================================
  async cleanupOldReschedules(days = 365) {
    try {
      const safeDays = Number(days);

      if (!Number.isInteger(safeDays) || safeDays <= 0) {
        return {
          success: false,
          message: 'Valid days value is required',
        };
      }

      const result = await db.query(
        `
        DELETE FROM EventReschedules
        WHERE created_at < NOW() - ($1 * INTERVAL '1 day')
        RETURNING id;
        `,
        [safeDays]
      );

      return {
        success: true,
        message: `${result?.rowCount || 0} old reschedule records removed`,
      };

    } catch (error) {
      console.error('[Cleanup Error]:', error);
      return {
        success: false,
        message: 'Failed to cleanup reschedule records',
      };
    }
  },
};

module.exports = postponementService;