// repositories/notificationsRepository.js

const pool = require('../../../config/db.js');

// ======================================================
// 🔹 CREATE SINGLE NOTIFICATION
// ======================================================
async function createNotification({
  user_id,
  title,
  message,
  type = 'info',
}) {
  const result = await pool.query(
    `
    INSERT INTO Notifications (
      user_id,
      title,
      message,
      type
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *;
    `,
    [user_id, title, message, type]
  );

  return result.rows[0] || null;
}

// ======================================================
// 🔹 CREATE BULK NOTIFICATIONS
// ======================================================
async function createBulkNotifications(notifications = []) {
  if (!notifications.length) return [];

  const values = [];
  const params = [];
  let index = 1;

  notifications.forEach((n) => {
    values.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3})`);

    params.push(
      n.user_id,
      n.title,
      n.message,
      n.type || 'info'
    );

    index += 4;
  });

  const result = await pool.query(
    `
    INSERT INTO Notifications (
      user_id,
      title,
      message,
      type
    )
    VALUES ${values.join(', ')}
    RETURNING *;
    `,
    params
  );

  return result.rows;
}

// ======================================================
// 🔹 GET NOTIFICATIONS
// ======================================================
async function getNotifications({
  user_id,
  type = null,
  read = null,
  search = null,
  start_date = null,
  end_date = null,
  limit = 50,
  offset = 0,
}) {
  // Guard against unbounded/invalid pagination values.
  limit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  offset = Math.max(Number(offset) || 0, 0);

  const conditions = ['user_id = $1'];
  const values = [user_id];
  let index = 2;

  if (type) {
    conditions.push(`type = $${index}`);
    values.push(type);
    index++;
  }

  if (read !== null && read !== undefined) {
    conditions.push(`is_read = $${index}`);
    values.push(read);
    index++;
  }

  if (search) {
    conditions.push(`(title ILIKE $${index} OR message ILIKE $${index})`);
    values.push(`%${search}%`);
    index++;
  }

  if (start_date) {
    conditions.push(`created_at >= $${index}`);
    values.push(start_date);
    index++;
  }

  if (end_date) {
    conditions.push(`created_at <= $${index}`);
    values.push(end_date);
    index++;
  }

  const whereClause = conditions.join(' AND ');

  const dataQueryValues = [...values, limit, offset];
  const limitIndex = index++;
  const offsetIndex = index++;

  const result = await pool.query(
    `
    SELECT *
    FROM Notifications
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${limitIndex}
    OFFSET $${offsetIndex};
    `,
    dataQueryValues
  );

  const countResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM Notifications
    WHERE ${whereClause};
    `,
    values
  );

  const unreadResult = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM Notifications
    WHERE user_id = $1
      AND is_read = FALSE;
    `,
    [user_id]
  );

  return {
    notifications: result.rows,
    pagination: {
      limit,
      offset,
      total: countResult.rows[0]?.total || 0,
      count: result.rows.length,
      has_more:
        offset + result.rows.length <
        (countResult.rows[0]?.total || 0),
    },
    unread_count: unreadResult.rows[0]?.count || 0,
  };
}

// ======================================================
// 🔹 GET UNREAD COUNT ONLY
// ======================================================
async function getUnreadCount(user_id) {
  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM Notifications
    WHERE user_id = $1
      AND is_read = FALSE;
    `,
    [user_id]
  );

  return result.rows[0]?.count || 0;
}

// ======================================================
// 🔹 MARK SINGLE AS READ
// ======================================================
async function markAsRead(user_id, notification_id) {
  const result = await pool.query(
    `
    UPDATE Notifications
    SET is_read = TRUE,
        read_at = CURRENT_TIMESTAMP
    WHERE notification_id = $1
      AND user_id = $2
    RETURNING *;
    `,
    [notification_id, user_id]
  );

  return result.rows[0] || null;
}

// ======================================================
// 🔹 MARK MULTIPLE AS READ
// ======================================================
async function markMultipleAsRead(user_id, ids = []) {
  if (!ids.length) return [];

  const result = await pool.query(
    `
    UPDATE Notifications
    SET is_read = TRUE,
        read_at = CURRENT_TIMESTAMP
    WHERE notification_id = ANY($1::uuid[])
      AND user_id = $2
    RETURNING *;
    `,
    [ids, user_id]
  );

  return result.rows;
}

// ======================================================
// 🔹 MARK BY TYPE AS READ
// ======================================================
async function markByTypeAsRead(user_id, type) {
  const result = await pool.query(
    `
    UPDATE Notifications
    SET is_read = TRUE,
        read_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
      AND type = $2
    RETURNING *;
    `,
    [user_id, type]
  );

  return result.rows;
}

// ======================================================
// 🔹 DELETE SINGLE
// ======================================================
async function deleteNotification(user_id, notification_id) {
  const result = await pool.query(
    `
    DELETE FROM Notifications
    WHERE notification_id = $1
      AND user_id = $2
    RETURNING *;
    `,
    [notification_id, user_id]
  );

  return result.rows[0] || null;
}

// ======================================================
// 🔹 DELETE BULK
// ======================================================
async function deleteBulkNotifications(user_id, ids = []) {
  if (!ids.length) return [];

  const result = await pool.query(
    `
    DELETE FROM Notifications
    WHERE notification_id = ANY($1::uuid[])
      AND user_id = $2
    RETURNING notification_id;
    `,
    [ids, user_id]
  );

  return result.rows;
}

// ======================================================
// 🔹 DELETE OLD
// ======================================================
async function deleteOldNotifications(days = 30) {
  const result = await pool.query(
    `
    DELETE FROM Notifications
    WHERE created_at < NOW() - ($1::int * INTERVAL '1 day')
    RETURNING notification_id;
    `,
    [days]
  );

  return {
    deleted: result.rowCount || 0,
  };
}

// ======================================================
// 🔹 EXPORTS
// ======================================================
module.exports = {
  createNotification,
  createBulkNotifications,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markMultipleAsRead,
  markByTypeAsRead,
  deleteNotification,
  deleteBulkNotifications,
  deleteOldNotifications,
};