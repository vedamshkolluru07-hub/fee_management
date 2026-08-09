const appSettingsRepo = require('../repositories/appSettingsRepository.js');

/**
 * ======================================================
 * 🔹 INITIALIZE APP SETTINGS (BOOTSTRAP)
 * ======================================================
 */
async function initializeAppSettingsService() {
  try {
    return await appSettingsRepo.initializeDefaults();
  } catch (err) {
    console.error('❌ init settings service error:', err.message);
    return { success: false, message: 'Service error' };
  }
}

/**
 * ======================================================
 * 🔹 UPDATE SETTING (SAFE SERVICE WRAPPER)
 * ======================================================
 */
async function updateSettingService(key, value) {
  try {
    return await appSettingsRepo.update(key, value);
  } catch (err) {
    console.error('❌ update setting service error:', err.message);
    return { success: false, message: 'Service error' };
  }
}

/**
 * ======================================================
 * 🔹 GET SETTING BY KEY
 * ======================================================
 */
async function getSettingService(key) {
  try {
    return await appSettingsRepo.findByKey(key);
  } catch (err) {
    console.error('❌ get setting service error:', err.message);
    return { success: false, message: 'Service error' };
  }
}

/**
 * ======================================================
 * 🔹 BUSINESS HELPERS
 * ======================================================
 */

async function isUserCreationRestricted() {
  try {
    const res = await appSettingsRepo.findByKey('restrict_user_creation');
    const val = res?.data?.value;
    return val === '1' || val === 'true';
  } catch {
    return false;
  }
}

async function getUserLimitService() {
  try {
    const res = await appSettingsRepo.findByKey('user_limit');
    return Number(res?.data?.value || 100);
  } catch {
    return 100;
  }
}

async function isAdminCreationRestricted() {
  try {
    const res = await appSettingsRepo.findByKey('restrict_admin_creation');
    const val = res?.data?.value;
    return val === '1' || val === 'true';
  } catch {
    return false;
  }
}

async function getAdminLimitService() {
  try {
    const res = await appSettingsRepo.findByKey('admin_limit');
    return Number(res?.data?.value || 2);
  } catch {
    return 2;
  }
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  initializeAppSettingsService,
  updateSettingService,
  getSettingService,

  isUserCreationRestricted,
  getUserLimitService,
  isAdminCreationRestricted,
  getAdminLimitService,
};