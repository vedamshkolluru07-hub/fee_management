// modules/website_management/controllers/enquiryTypeController.js

const enquiryTypeService = require('../services/enquiryTypeService.js');

/** GET /api/website/enquiry-types — public (active only) */
async function getActiveTypes(req, res) {
  const result = await enquiryTypeService.getActiveTypes();
  return res.status(result.success ? 200 : 500).json(result);
}

/** GET /api/website/enquiry-types/all — admin */
async function getAllTypes(req, res) {
  const result = await enquiryTypeService.getAllTypes();
  return res.status(result.success ? 200 : 500).json(result);
}

/** POST /api/website/enquiry-types — admin */
async function createType(req, res) {
  const result = await enquiryTypeService.createType(req.body);
  return res.status(result.success ? 201 : 400).json(result);
}

/** PUT /api/website/enquiry-types/:id — admin */
async function updateType(req, res) {
  const id = Number(req.params.id);
  const result = await enquiryTypeService.updateType(id, req.body);
  return res.status(result.success ? 200 : 400).json(result);
}

module.exports = { getActiveTypes, getAllTypes, createType, updateType };
