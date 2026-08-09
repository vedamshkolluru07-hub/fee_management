// config/session.js

const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const db = require('../utils/db.js');

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.SESSION_SECRET) {
  // Fail fast instead of silently running with a guessable default secret.
  throw new Error('❌ SESSION_SECRET is not set in .env');
}

// Single shared session middleware instance.
// Reused by:
//   1. server.js  -> app.use(sessionMiddleware)
//   2. index.js   -> io.engine.use(sessionMiddleware)  (so sockets see req.session too)
const sessionMiddleware = session({
  store: new pgSession({
    pool: db.pool,            // uses the existing pg Pool (same connection pool as the rest of the app)
    tableName: 'Sessions',    // your custom table
    createTableIfMissing: true,
  }),

  secret: process.env.SESSION_SECRET,

  resave: false,
  saveUninitialized: false,

  cookie: {
    httpOnly: true,
    secure: isProduction,     // true in production (requires HTTPS), false in local dev
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },

  name: 'sid', // session cookie name
});

module.exports = sessionMiddleware;