// repositories/calandarRepository.js

const db = require('../../../utils/db.js');

// ================= ALLOWED UPDATE FIELDS (security whitelist) =================
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

const calendarRepository = {

  // ======================================================
  // CREATE EVENT
  // ======================================================
  async createEvent({
    academic_year_id,
    title,
    description,
    start_time,
    end_time,
    color,
    reminder_schedule = {},
    is_admin_only = false,
    notify_before_minutes = 0,
    is_recurring = false,
    recurrence_rule = null,
    is_postponed = false,
    postponed_from = null,
    created_by = null,
  }) {
    const sql = `
      INSERT INTO calendar (
        academic_year_id,
        title,
        description,
        start_time,
        end_time,
        color,
        reminder_schedule,
        is_admin_only,
        notify_before_minutes,
        is_recurring,
        recurrence_rule,
        is_postponed,
        postponed_from,
        created_by
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7::jsonb,
        $8,$9,$10,$11,$12,$13,$14
      )
      RETURNING *;
    `;

    const params = [
      academic_year_id,
      title,
      description,
      start_time,
      end_time,
      color,
      JSON.stringify(reminder_schedule),
      is_admin_only,
      notify_before_minutes,
      is_recurring,
      recurrence_rule,
      is_postponed,
      postponed_from,
      created_by,

    ];

    const event = await db.get(sql, params);

    return {
      success: true,
      data: event,
    };
  },

  // ======================================================
  // GET EVENTS (FILTERED)
  // ======================================================
  async getEvents({
    fromDate,
    toDate,
    role = 'user',
    is_done,
    title,
    include_postponed = true,
  }) {
    let sql = `
      SELECT *
      FROM calendar
      WHERE 1=1
    `;

    const params = [];
    let i = 1;

    if (role === 'user') {
      sql += ` AND COALESCE(is_admin_only, false) = false`;
    }

    if (!include_postponed) {
      sql += ` AND is_postponed = false`;
    }

    if (fromDate) {
      sql += ` AND start_time >= $${i++}`;
      params.push(fromDate);
    }

    if (toDate) {
      sql += ` AND start_time <= $${i++}`;
      params.push(toDate);
    }

    if (title) {
      sql += ` AND title ILIKE $${i++}`;
      params.push(`%${title}%`);
    }

    if (typeof is_done === 'boolean') {
      sql += ` AND is_done = $${i++}`;
      params.push(is_done);
    }

    sql += `
      ORDER BY
        is_postponed DESC,
        start_time ASC
    `;

    const events = await db.all(sql, params);

    return {
      success: true,
      data: events,
    };
  },

  // ======================================================
  // GET EVENT BY ID
  // ======================================================
  async getEventById(event_id) {
    const sql = `
      SELECT *
      FROM calendar
      WHERE event_id = $1
    `;

    const event = await db.get(sql, [event_id]);

    return event
      ? { success: true, data: event }
      : { success: false, message: 'Event not found' };
  },

  // ======================================================
  // UPCOMING 15 DAYS EVENTS
  // ======================================================
  async getUpcoming15DayEvents() {
    const sql = `
      SELECT *
      FROM calendar
      WHERE start_time BETWEEN NOW()
      AND NOW() + INTERVAL '15 days'
      ORDER BY start_time ASC
    `;

    const events = await db.all(sql);

    return {
      success: true,
      data: events,
    };
  },

  // ======================================================
  // LOGIN ALERT EVENTS (NEXT 24 HOURS)
  // ======================================================
  async getLoginAlertEvents() {
    const sql = `
      SELECT *
      FROM calendar
      WHERE start_time BETWEEN NOW()
      AND NOW() + INTERVAL '1 day'
      ORDER BY start_time ASC
    `;

    const events = await db.all(sql);

    return {
      success: true,
      data: events,
    };
  },

  // ======================================================
  // RECENT COMPLETED EVENT
  // ======================================================
  async getRecentCompletedEvent() {
    const sql = `
      SELECT *
      FROM calendar
      WHERE is_done = TRUE
      ORDER BY completed_at DESC NULLS LAST
      LIMIT 1
    `;

    const event = await db.get(sql);

    return {
      success: !!event,
      data: event || null,
    };
  },

  // ======================================================
  // UPDATE EVENT (SAFE)
  // ======================================================
  async updateEvent(event_id, updateFields = {}) {
    const keys = Object.keys(updateFields)
      .filter(key => ALLOWED_UPDATE_FIELDS.has(key));

    if (!keys.length) {
      return {
        success: false,
        message: 'No valid fields to update',
      };
    }

    const setClause = keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');

    const params = keys.map(key => {
      if (key === 'reminder_schedule') {
        return JSON.stringify(updateFields[key] || {});
      }
      return updateFields[key];
    });

    params.push(event_id);

    const sql = `
      UPDATE calendar
      SET ${setClause},
          updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $${keys.length + 1}
      RETURNING *;
    `;

    const updated = await db.get(sql, params);

    return updated
      ? { success: true, data: updated }
      : { success: false, message: 'Event not found or not updated' };
  },

  // ======================================================
  // DELETE SINGLE EVENT
  // ======================================================
  async deleteEvent(event_id) {
    const sql = `
      DELETE FROM calendar
      WHERE event_id = $1
      RETURNING event_id;
    `;

    const deleted = await db.get(sql, [event_id]);

    return deleted
      ? { success: true, message: 'Event deleted successfully' }
      : { success: false, message: 'Event not found' };
  },

  // ======================================================
  // BULK DELETE
  // ======================================================
  async deleteBulk(eventIds = []) {
    if (!eventIds.length) {
      return {
        success: false,
        message: 'No event IDs provided',
      };
    }

    const placeholders = eventIds
      .map((_, i) => `$${i + 1}`)
      .join(', ');

    const sql = `
      DELETE FROM calendar
      WHERE event_id IN (${placeholders})
      RETURNING event_id;
    `;

    const deleted = await db.all(sql, eventIds);

    return {
      success: true,
      message: `${deleted.length} events deleted`,
      deletedIds: deleted.map(e => e.event_id),
    };
  },
};

module.exports = calendarRepository;