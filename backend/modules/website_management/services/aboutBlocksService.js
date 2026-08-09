// modules/website_management/services/aboutBlocksService.js

const repo = require('../repositories/aboutBlocksRepository.js');

async function getPublished() {
  return repo.findByStatus('published');
}

async function getDraft() {
  return repo.findByStatus('draft');
}

async function createBlock(payload, userId) {
  if (!payload?.textContent) {
    return { success: false, message: 'textContent is required' };
  }
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
