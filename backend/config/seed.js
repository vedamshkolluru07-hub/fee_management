// seed.js

const bcrypt = require('bcrypt');
const db = require('../utils/db.js');

async function seedInitialUsers() {
  try {
    console.log('🚀 Starting user seeding...');

    // Check if users already exist
    const userCountResult = await db.query(
      'SELECT COUNT(*) AS count FROM Users'
    );

    const userCount = parseInt(userCountResult.rows[0].count, 10);

    if (userCount > 0) {
      console.log('ℹ️ Seed skipped - users already exist.');
      return;
    }

    const users = [
      {
        username: 'admin',
        first_name: 'System',
        last_name: 'Admin',
        password: '955378',
        role: 'admin',
        can_manage_users: true,
        phone: '9553788682',
        is_approved: true,
        email: 'ssmodelhighschool2023@gmail.com',
        approved_by: null,
        deleted: false,
      },
      {
        username: 'Vedamsh',
        first_name: 'Vedamsh',
        last_name: 'User',
        password: '8@79350Ab4',
        role: 'moderator',
        can_manage_users: true,
        phone: '8179350124',
        is_approved: true,
        email: 'vedamshkolluru07@gmail.com',
        approved_by: null,
        deleted: false,
      },
    ];

    const insertUserQuery = `
      INSERT INTO Users (
        username,
        first_name,
        last_name,
        password_hash,
        role,
        can_manage_users,
        phone,
        is_approved,
        email,
        approved_by,
        created_at,
        last_action_at,
        deleted
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW(),$11
      )
      RETURNING user_id;
    `;

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);

      await db.query(insertUserQuery, [
        user.username,
        user.first_name,
        user.last_name,
        passwordHash,
        user.role,
        user.can_manage_users,
        user.phone,
        user.is_approved,
        user.email,
        user.approved_by,
        user.deleted,
      ]);

      console.log(`✅ User "${user.username}" created.`);
    }

    console.log('🎉 Seeding complete.');
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
  }
}

// Run directly
if (require.main === module) {
  seedInitialUsers().then(() => process.exit(0));
}

module.exports = seedInitialUsers;