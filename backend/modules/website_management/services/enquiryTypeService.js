// modules/website_management/services/enquiryTypeService.js

const repo = require('../repositories/enquiryTypeRepository.js');

async function getActiveTypes() {
  return repo.findAllActive();
}

async function getAllTypes() {
  return repo.findAll();
}

function slugify(label) {
  return String(label)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function createType({ label, displayOrder }) {
  if (!label) return { success: false, message: 'label is required' };
  const code = slugify(label);
  return repo.create({ code, label, displayOrder });
}

async function updateType(id, changes) {
  if (!id) return { success: false, message: 'id is required' };
  return repo.update(id, changes);
}

module.exports = { getActiveTypes, getAllTypes, createType, updateType };
