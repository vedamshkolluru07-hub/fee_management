// modules/website_management/services/homeBlocksService.js

const repo = require('../repositories/homeBlocksRepository.js');

const VALID_TYPES = new Set(['text', 'image']);

function validateBlockInput(payload) {
  if (!payload || !VALID_TYPES.has(payload.blockType)) {
    return 'blockType must be "text" or "image"';
  }
  if (payload.blockType === 'text' && !payload.textContent) {
    return 'textContent is required for text blocks';
  }
  if (payload.blockType === 'image' && !Array.isArray(payload.images)) {
    return 'images must be an array for image blocks';
  }
  return null;
}

async function getPublished() {
  return repo.findByStatus('published');
}

async function getDraft() {
  return repo.findByStatus('draft');
}

async function createBlock(payload, userId) {
  const error = validateBlockInput(payload);
  if (error) return { success: false, message: error };
  return repo.create(payload, userId);
}

async function updateBlock(id, changes, userId) {
  if (!id) return { success: false, message: 'id is required' };
  return repo.update(id, changes, userId);
}

async function deleteBlock(id) {
  if (!id) return { success: false, message: 'id is required' };
  return repo.remove(id);
}

async function publish() {
  return repo.publish();
}

async function discardDraft() {
  return repo.discardDraft();
}

module.exports = { getPublished, getDraft, createBlock, updateBlock, deleteBlock, publish, discardDraft };
