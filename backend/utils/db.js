// utils/db.js

const pool = require('../config/db.js');

const db = {
  async query(text, params = []) {
    return pool.query(text, params);
  },

  async getClient() {
    return pool.connect();
  },

  async get(sql, params = []) {
    const client = await pool.connect();
    try {
      const res = await client.query(sql, params);
      return res.rows[0] ?? null;
    } finally {
      client.release();
    }
  },

  async all(sql, params = []) {
    const client = await pool.connect();
    try {
      const res = await client.query(sql, params);
      return res.rows ?? [];
    } finally {
      client.release();
    }
  },

  async transaction(workFn) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await workFn(client);

      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
      throw err;
    } finally {
      client.release();
    }
  },

  async ping() {
    const res = await pool.query('SELECT 1 AS ok');
    return res.rows[0]?.ok === 1;
  }
};

module.exports = {
  ...db,
  pool
};