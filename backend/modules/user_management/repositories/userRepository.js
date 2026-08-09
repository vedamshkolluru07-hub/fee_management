const db = require('../../../utils/db.js');

/**
 * -----------------------------------
 * HELPERS
 * -----------------------------------
 */

const normalizeToArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const ALLOWED_FIELDS = new Set([
  'password_hash',
  'is_approved',
  'can_manage_users',
  'deleted',
  'role',
  'email',
  'phone',
  'username',
  'first_name',
  'last_name'
]);

const DEFAULT_USER_COLUMNS = `
  user_id,
  username,
  first_name,
  last_name,
  role,
  email,
  phone,
  can_manage_users,
  is_approved,
  approved_by,
  created_at,
  last_action_at,
  deleted
`;

// NOTE: getUser()/getUserById() still SELECT * (including password_hash)
// because authService needs the hash to verify login credentials, and
// attachUser needs a single generic lookup. Nothing in this file decides
// who is ALLOWED to see that data — that authorization/scoping decision,
// and stripping password_hash before it reaches an HTTP response, is the
// job of userService.js / userController.js. Do not expose these repo
// functions' raw output directly to the client.

const MAX_LIMIT = 100;

/**
 * -----------------------------------
 * UNIQUE FIELD CHECK
 * -----------------------------------
 */

async function checkUniqueFields({
  username,
  phone,
  email,
  excludeUserId = null
}) {
  try {
    const conditions = [];
    const values = [];
    let i = 1;

    if (username) {
      conditions.push(`username = $${i++}`);
      values.push(username);
    }

    if (phone) {
      conditions.push(`phone = $${i++}`);
      values.push(phone);
    }

    if (email) {
      conditions.push(`email = $${i++}`);
      values.push(email);
    }

    if (!conditions.length) {
      return { isUnique: true };
    }

    let query = `
      SELECT user_id, username, phone, email
      FROM Users
      WHERE (${conditions.join(' OR ')})
    `;

    if (excludeUserId) {
      query += ` AND user_id != $${i}`;
      values.push(excludeUserId);
    }

    const result = await db.query(query, values);

    if (result.rows.length) {
      return {
        isUnique: false,
        conflict: result.rows[0]
      };
    }

    return { isUnique: true };

  } catch {
    return {
      isUnique: false,
      message: 'Database error while checking uniqueness'
    };
  }
}

/**
 * -----------------------------------
 * CREATE USER BASE
 * -----------------------------------
 */

async function createUserBase(data) {
  const {
    username,
    first_name,
    last_name,
    password_hash,
    email,
    phone,
    role,
    can_manage_users,
    is_approved
  } = data;

  try {
    const uniqueCheck = await checkUniqueFields({
      username,
      phone,
      email
    });

    if (!uniqueCheck.isUnique) {
      return {
        success: false,
        message: 'User already exists',
        conflict: uniqueCheck.conflict
      };
    }

    const result = await db.query(
      `
      INSERT INTO Users (
        username,
        first_name,
        last_name,
        password_hash,
        role,
        email,
        phone,
        can_manage_users,
        is_approved,
        deleted
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,FALSE
      )
      RETURNING ${DEFAULT_USER_COLUMNS}
      `,
      [
        username,
        first_name,
        last_name,
        password_hash,
        role,
        email || null,
        phone,
        can_manage_users,
        is_approved
      ]
    );

    return {
      success: true,
      data: result.rows[0]
    };

  } catch (err) {
    if (err.code === '23505') {
      return {
        success: false,
        message: 'Duplicate field violation'
      };
    }

    return {
      success: false,
      message: 'Database error while creating user'
    };
  }
}

/**
 * -----------------------------------
 * CREATE ADMIN
 * -----------------------------------
 */

async function createAdmin(data) {
  return createUserBase({
    ...data,
    role: data.role || 'admin',
    can_manage_users: true,
    is_approved: true
  });
}

/**
 * -----------------------------------
 * CREATE USER
 * -----------------------------------
 */

async function createUser(data) {
  return createUserBase({
    ...data,
    role: data.role || 'user',
    can_manage_users: false,
    is_approved: false
  });
}

/**
 * -----------------------------------
 * GET USER (internal use — includes password_hash)
 * -----------------------------------
 */

async function getUser(identifier) {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM Users
      WHERE username = $1
         OR email = $1
         OR phone = $1
      LIMIT 1
      `,
      [identifier]
    );

    if (!result.rows.length) {
      return {
        success: false,
        message: 'User not found',
        data: null
      };
    }

    return {
      success: true,
      data: result.rows[0]
    };

  } catch {
    return {
      success: false,
      message: 'Database error while fetching user'
    };
  }
}

/**
 * -----------------------------------
 * GET USER BY ID (internal use — includes password_hash)
 * -----------------------------------
 */

async function getUserById(userId) {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM Users
      WHERE user_id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (!result.rows.length) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    return {
      success: true,
      data: result.rows[0]
    };

  } catch {
    return {
      success: false,
      message: 'Database error'
    };
  }
}

/**
 * -----------------------------------
 * GET USER ID BY NAME
 * -----------------------------------
 */

async function getUserIdByName(name) {
  try {
    const result = await db.query(
      `
      SELECT
        user_id,
        first_name,
        last_name
      FROM Users
      WHERE
        LOWER(first_name) LIKE LOWER($1)
        OR LOWER(last_name) LIKE LOWER($1)
        OR LOWER(first_name || ' ' || last_name) LIKE LOWER($1)
      LIMIT 10
      `,
      [`%${name}%`]
    );

    return result.rows;

  } catch {
    return [];
  }
}

/**
 * -----------------------------------
 * GET USER DETAILS BY NAME
 * -----------------------------------
 */

async function getUserDetailsByName(name) {
  const users = await getUserIdByName(name);

  if (!users.length) {
    return {
      success: false,
      message: 'No users found'
    };
  }

  return getUserById(users[0].user_id);
}

/**
 * -----------------------------------
 * GET ALL USERS (safe columns only)
 * -----------------------------------
 */

async function getAllUsers(filters = {}) {
  try {
    const {
      excludeUserId,
      role,
      is_approved,
      can_manage_users,
      deleted,
      search,
      limit = 50,
      offset = 0
    } = filters;

    // Hard cap so a client can never request an unbounded page.
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), MAX_LIMIT);
    const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

    let query = `
      SELECT ${DEFAULT_USER_COLUMNS}
      FROM Users
      WHERE 1=1
    `;

    const params = [];
    let i = 1;

    if (excludeUserId) {
      query += ` AND user_id != $${i++}`;
      params.push(excludeUserId);
    }

    if (role) {
      query += ` AND role = $${i++}`;
      params.push(role);
    }

    if (typeof is_approved === 'boolean') {
      query += ` AND is_approved = $${i++}`;
      params.push(is_approved);
    }

    if (typeof can_manage_users === 'boolean') {
      query += ` AND can_manage_users = $${i++}`;
      params.push(can_manage_users);
    }

    if (typeof deleted === 'boolean') {
      query += ` AND deleted = $${i++}`;
      params.push(deleted);
    }

    if (search) {
      query += `
        AND (
          username ILIKE $${i}
          OR first_name ILIKE $${i}
          OR last_name ILIKE $${i}
          OR email ILIKE $${i}
          OR phone ILIKE $${i}
        )
      `;
      params.push(`%${search}%`);
      i++;
    }

    query += `
      ORDER BY created_at DESC
      LIMIT $${i++}
      OFFSET $${i++}
    `;

    params.push(safeLimit, safeOffset);

    const result = await db.query(query, params);

    return {
      success: true,
      data: result.rows
    };

  } catch {
    return {
      success: false,
      message: 'Database error while fetching users'
    };
  }
}

/**
 * -----------------------------------
 * UPDATE FIELD
 * -----------------------------------
 */

async function updateField(userIds, field, value) {
  const ids = normalizeToArray(userIds);

  if (!ids.length) {
    return {
      success: false,
      message: 'No user IDs provided'
    };
  }

  if (!ALLOWED_FIELDS.has(field)) {
    return {
      success: false,
      message: 'Invalid field update attempt'
    };
  }

  try {
    if (
      ['username', 'phone', 'email'].includes(field)
    ) {
      const uniqueCheck = await checkUniqueFields({
        [field]: value,
        excludeUserId: ids[0]
      });

      if (!uniqueCheck.isUnique) {
        return {
          success: false,
          message: `${field} already exists`,
          conflict: uniqueCheck.conflict
        };
      }
    }

    const placeholders = ids
      .map((_, idx) => `$${idx + 1}`)
      .join(',');

    const query = `
      UPDATE Users
      SET
        ${field} = $${ids.length + 1},
        last_action_at = CURRENT_TIMESTAMP
      WHERE user_id IN (${placeholders})
    `;

    await db.query(query, [...ids, value]);

    return {
      success: true
    };

  } catch {
    return {
      success: false,
      message: 'Database error while updating user'
    };
  }
}

/**
 * -----------------------------------
 * WRAPPERS
 * -----------------------------------
 */

const updatePassword = (id, val) =>
  updateField(id, 'password_hash', val);

const toggleIsApproved = (id, val) =>
  updateField(id, 'is_approved', val);

const toggleCanManageUsers = (id, val) =>
  updateField(id, 'can_manage_users', val);

const toggleDeleted = (id, val) =>
  updateField(id, 'deleted', val);

const changeUserRole = (id, val) =>
  updateField(id, 'role', val);

/**
 * -----------------------------------
 * BULK UPDATE USER DATA
 * -----------------------------------
 */

async function updateUserData(userIds, data) {
  const ids = normalizeToArray(userIds);

  if (!ids.length) {
    return {
      success: false,
      message: 'No user IDs provided'
    };
  }

  const fields = Object.keys(data);

  if (!fields.length) {
    return {
      success: false,
      message: 'No update data provided'
    };
  }

  for (const field of fields) {
    if (!ALLOWED_FIELDS.has(field)) {
      return {
        success: false,
        message: `Invalid field: ${field}`
      };
    }
  }

  try {
    const setParts = [];
    const values = [];
    let i = 1;

    for (const field of fields) {
      setParts.push(`${field} = $${i++}`);
      values.push(data[field]);
    }

    setParts.push(`last_action_at = CURRENT_TIMESTAMP`);

    const placeholders = ids
      .map((_, idx) => `$${i + idx}`)
      .join(',');

    values.push(...ids);

    const query = `
      UPDATE Users
      SET ${setParts.join(', ')}
      WHERE user_id IN (${placeholders})
    `;

    await db.query(query, values);

    return {
      success: true
    };

  } catch {
    return {
      success: false,
      message: 'Database error while updating users'
    };
  }
}

/**
 * -----------------------------------
 * HARD DELETE USERS
 * -----------------------------------
 */

async function deleteUsers(userIds) {
  const ids = normalizeToArray(userIds);

  if (!ids.length) {
    return {
      success: false,
      message: 'No user IDs provided'
    };
  }

  try {
    const placeholders = ids
      .map((_, idx) => `$${idx + 1}`)
      .join(',');

    await db.query(
      `
      DELETE FROM Users
      WHERE user_id IN (${placeholders})
      `,
      ids
    );

    return {
      success: true
    };

  } catch {
    return {
      success: false,
      message: 'Database error while deleting users'
    };
  }
}

/**
 * -----------------------------------
 * SOFT DELETE USERS
 * -----------------------------------
 */

async function softDeleteUsers(userIds) {
  return toggleDeleted(userIds, true);
}

/**
 * -----------------------------------
 * DELETE UNAPPROVED USERS
 * -----------------------------------
 */

async function deleteUnapprovedUsers() {
  try {
    const result = await db.query(`
      DELETE FROM Users
      WHERE is_approved = FALSE
      RETURNING user_id
    `);

    return {
      success: true,
      affectedUsers: result.rows.map((row) => row.user_id)
    };

  } catch {
    return {
      success: false,
      message: 'Database error'
    };
  }
}

/**
 * -----------------------------------
 * DELETE SOFT DELETED USERS
 * -----------------------------------
 */

async function deleteSoftDeletedUsers() {
  try {
    const result = await db.query(`
      DELETE FROM Users
      WHERE deleted = TRUE
      RETURNING user_id
    `);

    return {
      success: true,
      affectedUsers: result.rows.map((row) => row.user_id)
    };

  } catch {
    return {
      success: false,
      message: 'Database error'
    };
  }
}

/**
 * -----------------------------------
 * TOTAL USERS BY ROLE
 * -----------------------------------
 */

async function getTotalUsersByRole(role = 'user') {
  try {
    const result = await db.query(
      `
      SELECT COUNT(*)::INT AS total
      FROM Users
      WHERE role = $1
        AND deleted = FALSE
      `,
      [role]
    );

    return {
      success: true,
      total: result.rows[0].total
    };

  } catch {
    return {
      success: false,
      message: 'Database error while fetching user count'
    };
  }
}

/**
 * -----------------------------------
 * ADMIN STATS
 * -----------------------------------
 */

async function getAdminStats() {
  try {
    const result = await db.query(
      `
      SELECT user_id
      FROM Users
      WHERE role = 'admin'
        AND deleted = FALSE
      `
    );

    const adminIds = result.rows.map(
      (row) => row.user_id
    );

    return {
      success: true,
      totalAdmins: adminIds.length,
      adminIds
    };

  } catch {
    return {
      success: false,
      message: 'Database error while fetching admin stats'
    };
  }
}

/**
 * -----------------------------------
 * EXPORTS
 * -----------------------------------
 */

module.exports = {
  ALLOWED_FIELDS,

  createAdmin,
  createUser,

  getUser,
  getUserById,
  getUserIdByName,
  getUserDetailsByName,
  getAllUsers,

  getTotalUsersByRole,
  getAdminStats,

  updatePassword,
  toggleIsApproved,
  toggleCanManageUsers,
  toggleDeleted,
  changeUserRole,

  updateUserData,

  deleteUsers,
  softDeleteUsers,
  deleteUnapprovedUsers,
  deleteSoftDeletedUsers
};