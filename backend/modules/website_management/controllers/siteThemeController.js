// modules/website_management/controllers/siteThemeController.js

const siteThemeService = require('../services/siteThemeService.js');

/** GET /api/website/theme — public */
async function getTheme(req, res) {
  const result = await siteThemeService.getTheme();
  return res.status(result.success ? 200 : 500).json(result);
}

/** PUT /api/website/theme — admin */
async function updateTheme(req, res) {
  const result = await siteThemeService.updateTheme(req.body);
  return res.status(result.success ? 200 : 400).json(result);
}

module.exports = { getTheme, updateTheme };
