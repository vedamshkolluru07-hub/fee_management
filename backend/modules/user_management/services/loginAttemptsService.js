const loginAttemptsRepo = require('../repositories/loginAttemptRepository.js');

/**
 * ======================================================
 * 🔹 GET USER LOGIN ATTEMPTS (SERVICE LAYER)
 * ======================================================
 * Purpose:
 * - Fetch paginated login attempts for a user
 * - Keeps controller clean
 */
async function getUserLoginAttemptsService({
  user_id,
  limit = 50,
  offset = 0,
}) {
  try {
    // 🔹 Basic validation
    if (!user_id) {
      return {
        success: false,
        message: 'user_id is required',
      };
    }

    // 🔹 Ensure numeric safety
    const safeLimit = Number(limit) > 0 ? Number(limit) : 50;
    const safeOffset = Number(offset) >= 0 ? Number(offset) : 0;

    const result = await loginAttemptsRepo.getUserLoginAttempts(
      user_id,
      safeLimit,
      safeOffset
    );

    if (!result.success) {
      return {
        success: false,
        message: result.message || 'Failed to fetch login attempts',
      };
    }

    return {
      success: true,
      user_id,
      data: result.data || [],
    };

  } catch (err) {
    console.error('❌ getUserLoginAttemptsService error:', err.message);
    return {
      success: false,
      message: 'Service error while fetching login attempts',
    };
  }
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  getUserLoginAttemptsService,
};