// modules/website_management/controllers/connectLinksController.js

const connectLinksService = require('../services/connectLinksService.js');

/** GET /api/website/connect-links — public (enabled only) */
async function getEnabledLinks(req, res) {
  const result = await connectLinksService.getEnabledLinks();
  return res.status(result.success ? 200 : 500).json(result);
}

/** GET /api/website/connect-links/all — admin */
async function getAllLinks(req, res) {
  const result = await connectLinksService.getAllLinks();
  return res.status(result.success ? 200 : 500).json(result);
}

/** PUT /api/website/connect-links/:platform — admin */
async function updateLink(req, res) {
  const { platform } = req.params;
  const { value, isEnabled } = req.body;
  const result = await connectLinksService.updateLink(platform, { value, isEnabled });
  return res.status(result.success ? 200 : 400).json(result);
}

module.exports = { getEnabledLinks, getAllLinks, updateLink };
