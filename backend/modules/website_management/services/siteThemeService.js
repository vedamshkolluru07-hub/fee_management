// modules/website_management/services/siteThemeService.js

const repo = require('../repositories/siteThemeRepository.js');

const HEX_REGEX = /^#[0-9A-Fa-f]{3,8}$/;

function validateColors(payload) {
  const fields = ['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor'];
  for (const field of fields) {
    if (payload[field] !== undefined && !HEX_REGEX.test(payload[field])) {
      return `${field} must be a valid hex color (e.g. #2563eb)`;
    }
  }
  return null;
}

async function getTheme() {
  return repo.find();
}

async function updateTheme(payload) {
  const error = validateColors(payload);
  if (error) return { success: false, message: error };
  return repo.update(payload);
}

module.exports = { getTheme, updateTheme };
