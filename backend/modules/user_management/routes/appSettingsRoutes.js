// routes/appSettingsRoutes.js

const express = require('express');
const router = express.Router();

const appSettingsController = require('../controllers/appSettingsController.js');

/**
 * ======================================================
 * 🔹 APP SETTINGS ROUTES
 * ======================================================
 */

// Initialize default settings
router.post('/init', appSettingsController.initializeAppSettings);

// Update setting (create or update)
router.put('/update', appSettingsController.updateSetting);

// Get setting by key
router.get('/:key', appSettingsController.getSetting);

/**
 * ======================================================
 * 🔹 BUSINESS HELPERS ROUTES
 * ======================================================
 */

// Check if user creation is restricted
router.get('/user/restriction', appSettingsController.checkUserRestriction);

// Get user limit
router.get('/user/limit', appSettingsController.getUserLimit);

// Check if admin creation is restricted
router.get('/admin/restriction', appSettingsController.checkAdminRestriction);

// Get admin limit
router.get('/admin/limit', appSettingsController.getAdminLimit);

module.exports = router;