// modules/website_management/controllers/homeBlocksController.js

const homeBlocksService = require('../services/homeBlocksService.js');

/** GET /api/website/home/published — public */
async function getPublished(req, res) {
  const result = await homeBlocksService.getPublished();
  return res.status(result.success ? 200 : 500).json(result);
}

/** GET /api/website/home/draft — admin */
async function getDraft(req, res) {
  const result = await homeBlocksService.getDraft();
  return res.status(result.success ? 200 : 500).json(result);
}

/** POST /api/website/home/blocks — admin */
async function createBlock(req, res) {
  const result = await homeBlocksService.createBlock(req.body, req.user?.user_id);
  return res.status(result.success ? 201 : 400).json(result);
}

/** PUT /api/website/home/blocks/:id — admin */
async function updateBlock(req, res) {
  const id = Number(req.params.id);
  const result = await homeBlocksService.updateBlock(id, req.body, req.user?.user_id);
  return res.status(result.success ? 200 : 400).json(result);
}

/** DELETE /api/website/home/blocks/:id — admin */
async function deleteBlock(req, res) {
  const id = Number(req.params.id);
  const result = await homeBlocksService.deleteBlock(id);
  return res.status(result.success ? 200 : 400).json(result);
}

/** POST /api/website/home/publish — admin */
async function publish(req, res) {
  const result = await homeBlocksService.publish();
  return res.status(result.success ? 200 : 500).json(result);
}

/** POST /api/website/home/discard-draft — admin */
async function discardDraft(req, res) {
  const result = await homeBlocksService.discardDraft();
  return res.status(result.success ? 200 : 500).json(result);
}

module.exports = { getPublished, getDraft, createBlock, updateBlock, deleteBlock, publish, discardDraft };
