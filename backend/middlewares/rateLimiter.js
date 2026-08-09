// ======================================================
// middlewares/rateLimiter.js (FINAL FIXED v7)
// ======================================================

const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

const createRateLimiter = ({
  max,
  windowMs,
  message = 'Too many requests. Please try again later.',
}) =>
  rateLimit({
    windowMs,
    max,

    message: {
      success: false,
      message,
    },

    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,

    // ======================================================
    // 🔍 DEBUG LOG (ONLY WHEN LIMIT IS HIT)
    // ======================================================
    handler: (req) => {
      console.warn('🟡 [RateLimiter] LIMIT HIT:', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        user: req.user?.user_id || null,
        time: new Date().toISOString(),
      });

      return {
        success: false,
        message,
      };
    },
  });

// ======================================================
// 🌐 GENERAL LIMITER
// ======================================================
const generalLimiter = createRateLimiter({
  max: isDev ? 1000 : 500,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests. Please slow down.',
});

// ======================================================
// 🔐 AUTH LIMITER
// ======================================================
const authLimiter = createRateLimiter({
  max: isDev ? 100 : 10,
  windowMs: 15 * 60 * 1000,
  message: 'Too many authentication attempts. Please try again later.',
});

module.exports = {
  generalLimiter,
  authLimiter,
};