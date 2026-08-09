// services/calendarService.js

const calendarRepository = require('../repositories/calanderRepository.js');
const { generateCalendarReminders } = require('./calendarReminderService.js');
const {
  createAuditLogService
} = require('../../user_management/services/auditLogServiceCreate.js');

// ================= SINGLE SOURCE OF TRUTH =================
const ALLOWED_UPDATE_FIELDS = new Set([
  'title',
  'description',
  'start_time',
  'end_time',
  'color',
  'reminder_schedule',
  'notify_before_minutes',
  'is_admin_only',
  'is_recurring',
  'recurrence_rule',
  'is_postponed',
  'postponed_from',
  'is_done',
  'completed_at',
  'notified_at',
]);

const isValidObject = (val) =>
  val && typeof val === 'object' && !Array.isArray(val);

const calendarService = {

  // ======================================================
  // SYNC PIPELINE (SAFE + FUTURE-READY)
  // ======================================================
  async syncCalendar() {
    try {
      await generateCalendarReminders();
      return true;
    } catch (error) {
      console.error('[Calendar Sync Error]:', error);
      return false;
    }
  },

  // ======================================================
  // CREATE EVENT
  // ======================================================
  async createEvent(data, actor_user_id = null) {
    try {
      if (!isValidObject(data)) {
        return {
          success: false,
          message: 'Event data is required',
        };
      }

      const { title, start_time } = data;

      if (!title?.trim() || !start_time) {
        return {
          success: false,
          message: 'title and start_time are required',
        };
      }

      const result = await calendarRepository.createEvent(data);

      if (!result?.success) {
        await createAuditLogService({
          actor_user_id,
          action: 'CREATE_EVENT',
          category: 'create',
          log_message: `Failed to create calendar event "${title}".`,
          target_entity_type: 'calendar',
          changes: {
            attempted_data: data,
          },
          success: false,
          severity: 'warning',
        });

        return {
          success: false,
          message: 'Failed to create event',
        };
      }

      await this.syncCalendar();

      await createAuditLogService({
        actor_user_id,
        action: 'CREATE_EVENT',
        category: 'create',
        log_message: `Created calendar event "${title}".`,
        target_entity_type: 'calendar',
        changes: {
          event_id: result.data?.event_id ?? null,
          created_data: data,
        },
        success: true,
        severity: 'info',
      });

      return result;

    } catch (error) {
      console.error('[createEvent Error]:', error);

      await createAuditLogService({
        actor_user_id,
        action: 'CREATE_EVENT',
        category: 'create',
        log_message: `Error creating calendar event "${data?.title || 'Unknown'}": ${error.message}`,
        target_entity_type: 'calendar',
        changes: {
          attempted_data: data,
          error: error.message,
        },
        success: false,
        severity: 'critical',
      });

      return {
        success: false,
        message: 'Failed to create event',
      };
    }
  },

  // ======================================================
  // GET EVENTS
  // ======================================================
  async getEvents(filters = {}) {
    try {
      return await calendarRepository.getEvents({
        role: filters.role || 'user',
        include_postponed: filters.include_postponed ?? true,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        is_done: filters.is_done,
        title: filters.title,
      });
    } catch (error) {
      console.error('[getEvents Error]:', error);
      return { success: false, message: 'Failed to fetch events' };
    }
  },

  // ======================================================
  // GET EVENT BY ID
  // ======================================================
  async getEventById(event_id) {
    try {
      if (!event_id) {
        return { success: false, message: 'event_id is required' };
      }

      return await calendarRepository.getEventById(event_id);

    } catch (error) {
      console.error('[getEventById Error]:', error);
      return { success: false, message: 'Failed to fetch event' };
    }
  },

  // ======================================================
  // UPCOMING EVENTS (15 DAYS)
  // ======================================================
  async getUpcoming15DayEvents() {
    try {
      return await calendarRepository.getUpcoming15DayEvents();
    } catch (error) {
      console.error('[15DayEvents Error]:', error);
      return { success: false, message: 'Failed to fetch upcoming events' };
    }
  },

  // ======================================================
  // LOGIN ALERT EVENTS (24 HOURS)
  // ======================================================
  async getLoginAlertEvents() {
    try {
      return await calendarRepository.getLoginAlertEvents();
    } catch (error) {
      console.error('[LoginAlert Error]:', error);
      return { success: false, message: 'Failed to fetch login alert events' };
    }
  },

  // ======================================================
  // RECENT COMPLETED EVENT
  // ======================================================
  async getRecentCompletedEvent() {
    try {
      return await calendarRepository.getRecentCompletedEvent();
    } catch (error) {
      console.error('[RecentCompleted Error]:', error);
      return {
        success: false,
        message: 'Failed to fetch recent completed event',
      };
    }
  },

  // ======================================================
  // UPDATE EVENT (SAFE PATCH)
  // ======================================================
  async updateEvent(event_id, updateFields, actor_user_id = null) {
    try {
      if (!event_id) {
        return {
          success: false,
          message: 'event_id is required',
        };
      }

      if (!isValidObject(updateFields)) {
        return {
          success: false,
          message: 'updateFields must be an object',
        };
      }

      const filteredUpdates = Object.keys(updateFields).reduce((acc, key) => {
        if (ALLOWED_UPDATE_FIELDS.has(key)) {
          acc[key] = updateFields[key];
        }
        return acc;
      }, {});

      if (!Object.keys(filteredUpdates).length) {
        return {
          success: false,
          message: 'No valid update fields provided',
        };
      }

      const result = await calendarRepository.updateEvent(
        event_id,
        filteredUpdates
      );

      if (!result?.success) {
        await createAuditLogService({
          actor_user_id,
          action: 'UPDATE_EVENT',
          category: 'update',
          log_message: `Failed to update calendar event (${event_id}).`,
          target_entity_type: 'calendar',
          changes: {
            event_id,
            attempted_updates: filteredUpdates,
          },
          success: false,
          severity: 'warning',
        });

        return {
          success: false,
          message: 'Failed to update event',
        };
      }

      await this.syncCalendar();

      await createAuditLogService({
        actor_user_id,
        action: 'UPDATE_EVENT',
        category: 'update',
        log_message: `Updated calendar event (${event_id}).`,
        target_entity_type: 'calendar',
        changes: {
          event_id,
          updated_fields: filteredUpdates,
        },
        success: true,
        severity: 'info',
      });

      return result;

    } catch (error) {
      console.error('[updateEvent Error]:', error);

      await createAuditLogService({
        actor_user_id,
        action: 'UPDATE_EVENT',
        category: 'update',
        log_message: `Error updating calendar event (${event_id}): ${error.message}`,
        target_entity_type: 'calendar',
        changes: {
          event_id,
          attempted_updates: updateFields,
          error: error.message,
        },
        success: false,
        severity: 'critical',
      });

      return {
        success: false,
        message: 'Failed to update event',
      };
    }
  },

  // ======================================================
  // DELETE SINGLE EVENT
  // ======================================================
  async deleteEvent(event_id, actor_user_id = null) {
    try {
      if (!event_id) {
        return {
          success: false,
          message: 'event_id is required',
        };
      }

      const result = await calendarRepository.deleteEvent(event_id);

      if (!result?.success) {
        await createAuditLogService({
          actor_user_id,
          action: 'DELETE_EVENT',
          category: 'delete',
          log_message: `Failed to delete calendar event (${event_id}).`,
          target_entity_type: 'calendar',
          changes: {
            event_id,
          },
          success: false,
          severity: 'warning',
        });

        return {
          success: false,
          message: 'Failed to delete event',
        };
      }

      await this.syncCalendar();

      await createAuditLogService({
        actor_user_id,
        action: 'DELETE_EVENT',
        category: 'delete',
        log_message: `Deleted calendar event (${event_id}).`,
        target_entity_type: 'calendar',
        changes: {
          event_id,
        },
        success: true,
        severity: 'info',
      });

      return result;

    } catch (error) {
      console.error('[deleteEvent Error]:', error);

      await createAuditLogService({
        actor_user_id,
        action: 'DELETE_EVENT',
        category: 'delete',
        log_message: `Error deleting calendar event (${event_id}): ${error.message}`,
        target_entity_type: 'calendar',
        changes: {
          event_id,
          error: error.message,
        },
        success: false,
        severity: 'critical',
      });

      return {
        success: false,
        message: 'Failed to delete event',
      };
    }
  },

  // ======================================================
  // BULK DELETE EVENTS
  // ======================================================
  async deleteBulk(eventIds = [], actor_user_id = null) {
    try {
      if (!Array.isArray(eventIds) || eventIds.length === 0) {
        return {
          success: false,
          message: 'eventIds array is required',
        };
      }

      const cleanIds = eventIds.filter(id => typeof id === 'number');

      if (cleanIds.length === 0) {
        return {
          success: false,
          message: 'No valid event IDs provided',
        };
      }

      const result = await calendarRepository.deleteBulk(cleanIds);

      if (!result?.success) {
        await createAuditLogService({
          actor_user_id,
          action: 'BULK_DELETE_EVENTS',
          category: 'delete',
          log_message: `Failed to delete ${cleanIds.length} calendar event(s).`,
          target_entity_type: 'calendar',
          changes: {
            event_ids: cleanIds,
            total_events: cleanIds.length,
          },
          success: false,
          severity: 'warning',
        });

        return {
          success: false,
          message: 'Failed to bulk delete events',
        };
      }

      await this.syncCalendar();

      await createAuditLogService({
        actor_user_id,
        action: 'BULK_DELETE_EVENTS',
        category: 'delete',
        log_message: `Deleted ${cleanIds.length} calendar event(s).`,
        target_entity_type: 'calendar',
        changes: {
          event_ids: cleanIds,
          total_events: cleanIds.length,
        },
        success: true,
        severity: 'info',
      });

      return result;

    } catch (error) {
      console.error('[deleteBulk Error]:', error);

      await createAuditLogService({
        actor_user_id,
        action: 'BULK_DELETE_EVENTS',
        category: 'delete',
        log_message: `Error bulk deleting calendar events: ${error.message}`,
        target_entity_type: 'calendar',
        changes: {
          event_ids: eventIds,
          error: error.message,
        },
        success: false,
        severity: 'critical',
      });

      return {
        success: false,
        message: 'Failed to bulk delete events',
      };
    }
  },
};

module.exports = calendarService;