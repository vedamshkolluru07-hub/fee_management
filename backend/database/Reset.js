require('dotenv').config();

const pool = require('../config/db');
const initSchema = require('./schema');
const seedInitialUsers = require('../config/seed');

const args = process.argv.slice(2);
const hasForce = args.includes('--force');

async function resetAndInit() {
  if (!hasForce) {
    console.error('❌ Refusing to reset without --force flag.');
    console.error('   Run: node database/reset.js --force');
    process.exit(1);
  }

  let client;

  try {
    console.log('⚠️ Connecting to database...');
    client = await pool.connect();

    console.log('⚠️ Dropping all tables...');

    await client.query(`
      DO $$ 
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public'
        ) LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    console.log('✅ All tables dropped successfully.');

  } catch (err) {
    console.error('❌ Failed while dropping tables:', err);
    process.exit(1);

  } finally {
    if (client) client.release();
  }

  try {
    console.log('🚀 Re-initializing database schema...');
    await initSchema();
    console.log('✅ Schema initialized');

    console.log('🌱 Reseeding initial data...');
    await seedInitialUsers();
    console.log('✅ Seed data restored');

    console.log('✅ Database reset and initialized successfully.');
    process.exit(0);

  } catch (err) {
    console.error('❌ Schema initialization failed:', err);
    process.exit(1);
  } finally {
    await pool.end().catch(() => {});
  }
}

resetAndInit();