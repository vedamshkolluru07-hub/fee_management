const loginAttemptsService = require('../services/loginAttemptsService.js');

/**
 * ======================================================
 * 🔹 GET USER LOGIN ATTEMPTS CONTROLLER
 * ======================================================
 * Route: GET /login-attempts/:user_id
 */
async function getUserLoginAttemptsController(req, res) {
  try {
    // 🚨 ROUTE HIT CONFIRMATION (MOST IMPORTANT DEBUG)
    console.log('====================================');
    console.log('🔥 [LOGIN ATTEMPTS CONTROLLER HIT]');
    console.log('📍 Route: GET /login-attempts/:user_id');
    console.log('🕒 Time:', new Date().toISOString());
    console.log('====================================');

    // 📥 Incoming request debug
    console.log('📥 Request Params:', req.params);
    console.log('📥 Request Query:', req.query);
    console.log('📥 Request Method:', req.method);
    console.log('📥 Request URL:', req.originalUrl);

    const { user_id } = req.params;
    const { limit, offset } = req.query;

    // 🧾 Extracted values debug
    console.log('🧾 Extracted user_id:', user_id);
    console.log('🧾 Extracted limit:', limit);
    console.log('🧾 Extracted offset:', offset);

    if (!user_id) {
      console.log('❌ Missing user_id in request params');
      return res.status(400).json({
        success: false,
        message: 'user_id is required',
      });
    }

    // ⚙️ Service call
    console.log('🚀 Calling loginAttemptsService...');

    const result = await loginAttemptsService.getUserLoginAttemptsService({
      user_id,
      limit,
      offset,
    });

    // 📤 Service response debug
    console.log('📤 Service Result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      console.log('⚠️ Service returned failure for user:', user_id);

      return res.status(400).json(result);
    }

    console.log('✅ Successfully fetched login attempts for:', user_id);

    return res.status(200).json(result);

  } catch (err) {
    // 🔥 FULL ERROR DEBUG
    console.error('❌ [LOGIN ATTEMPTS CONTROLLER ERROR]');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  getUserLoginAttemptsController,
};