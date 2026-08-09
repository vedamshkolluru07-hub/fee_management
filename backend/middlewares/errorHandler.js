// ======================================================
// middlewares/errorHandler.js (Improved + Debug Logs)
// ======================================================

const AppError = require('../utils/appErrorUtil.js');

/**
 * Global Error Handling Middleware
 * -----------------------------------------
 * Handles operational + unexpected errors safely.
 */

module.exports = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  // ======================================================
  // 🔍 DEBUG 1: Incoming error context
  // ======================================================
  console.error('🔴 [ErrorHandler] Error captured');

  console.error('🔍 [ErrorHandler] Request Info:', {
    method: req?.method,
    url: req?.originalUrl,
    user: req?.user?.user_id || null,
    sessionID: req?.sessionID || null,
  });

  // ======================================================
  // 1️⃣ NORMALIZE ERROR
  // ======================================================
  const statusCode = err.statusCode || 500;

  const isOperational =
    err instanceof AppError || err.isOperational === true;

  let message = err.message || 'Internal Server Error';

  // ======================================================
  // 2️⃣ HIDE INTERNAL ERRORS IN PRODUCTION
  // ======================================================
  if (!isDev && !isOperational) {
    message = 'Something went wrong. Please try again later.';
  }

  // ======================================================
  // 🔍 DEBUG 2: Error details
  // ======================================================
  console.error('🔍 [ErrorHandler] Error Details:', {
    message: err?.message,
    statusCode,
    isOperational,
    code: err?.code || null,
    details: err?.details || null,
  });

  if (err?.stack) {
    console.error('📌 [ErrorHandler] Stack Trace:\n', err.stack);
  }

  // ======================================================
  // 3️⃣ RESPONSE
  // ======================================================
  return res.status(statusCode).json({
    success: false,
    message,
    ...(isDev && {
      stack: err.stack,
      error: err,
    }),
  });
};