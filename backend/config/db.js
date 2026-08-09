const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../env') });

if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
  throw new Error('❌ Missing DB environment variables in .env file');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: Number(process.env.DB_PORT || 5432),
});

module.exports = pool;