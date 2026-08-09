// modules/website_management/controllers/aboutBlocksController.js

const aboutBlocksService = require('../services/aboutBlocksService.js');

async function getPublished(req, res) {
  const result = await aboutBlocksService.getPublished();
  return res.status(result.success ? 200 : 500).json(result);
}

async function getDraft(req, res) {
  const result = await aboutBlocksService.getDraft();
  return res.status(result.success ? 200 : 500).json(result);
}

async function createBlock(req, res) {
  const result = await aboutBlocksService.createBlock(req.body, req.user?.user_id);
  return res.status(result.success ? 201 : 400).json(result);
}

async function updateBlock(req, res) {
  const id = Number(req.params.id);
  const result = await aboutBlocksService.updateBlock(id, req.body, req.user?.user_id);
  return res.status(result.success ? 200 : 400).json(result);
}

async function deleteBlock(req, res) {
  const id = Number(req.params.id);
  const result = await aboutBlocksService.deleteBlock(id);
  return res.status(result.success ? 200 : 400).json(result);
}

async function publish(req, res) {
  const result = await aboutBlocksService.publish();
  return res.status(result.success ? 200 : 500).json(result);
}

async function discardDraft(req, res) {
  const result = await aboutBlocksService.discardDraft();
  return res.status(result.success ? 200 : 500).json(result);
}

module.exports = { getPublished, getDraft, createBlock, updateBlock, deleteBlock, publish, discardDraft };
