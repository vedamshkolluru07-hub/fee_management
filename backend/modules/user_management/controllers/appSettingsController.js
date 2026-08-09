// controllers/appSettingsController.js

const appSettingsService = require('../services/appSettingsService.js');

/**
 * ======================================================
 * 🔹 INITIALIZE APP SETTINGS
 * ======================================================
 */
async function initializeAppSettings(req, res) {
  const result = await appSettingsService.initializeAppSettingsService();

  if (!result.success) {
    return res.status(500).json(result);
  }

  return res.status(200).json(result);
}

/**
 * ======================================================
 * 🔹 UPDATE SETTING
 * ======================================================
 */
async function updateSetting(req, res) {
  const { key, value } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({
      success: false,
      message: 'key and value are required',
    });
  }

  const result = await appSettingsService.updateSettingService(key, value);

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.status(200).json(result);
}

/**
 * ======================================================
 * 🔹 GET SETTING BY KEY
 * ======================================================
 */
async function getSetting(req, res) {
  const { key } = req.params;

  if (!key) {
    return res.status(400).json({
      success: false,
      message: 'key is required',
    });
  }

  const result = await appSettingsService.getSettingService(key);

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.status(200).json(result);
}

/**
 * ======================================================
 * 🔹 BUSINESS HELPERS ENDPOINTS
 * ======================================================
 */

async function checkUserRestriction(req, res) {
  const restricted = await appSettingsService.isUserCreationRestricted();
  return res.status(200).json({ success: true, restricted });
}

async function getUserLimit(req, res) {
  const limit = await appSettingsService.getUserLimitService();
  return res.status(200).json({ success: true, limit });
}

async function checkAdminRestriction(req, res) {
  const restricted = await appSettingsService.isAdminCreationRestricted();
  return res.status(200).json({ success: true, restricted });
}

async function getAdminLimit(req, res) {
  const limit = await appSettingsService.getAdminLimitService();
  return res.status(200).json({ success: true, limit });
}

/**
 * ======================================================
 * 🔹 EXPORTS
 * ======================================================
 */
module.exports = {
  initializeAppSettings,
  updateSetting,
  getSetting,

  checkUserRestriction,
  getUserLimit,
  checkAdminRestriction,
  getAdminLimit,
};