// ======================================================
// database/init.js — Standalone DB Initializer
// Run with: node database/init.js
// Creates schema (if not exists) + seeds initial data.
// Does NOT touch existing data or start the server.
// ======================================================
require('dotenv').config();

const pool = require('../config/db');
const initSchema = require('./schema');
const seedInitialUsers = require('../config/seed');

async function init() {
  try {
    console.log('🚀 Initializing database...');

    await initSchema();
    console.log('✅ Schema initialized');

    await seedInitialUsers();
    console.log('🌱 Seed data initialized');

    console.log('🎉 Database init complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database init failed:', err);
    process.exit(1);
  } finally {
    await pool.end().catch(() => {});
  }
}

init();