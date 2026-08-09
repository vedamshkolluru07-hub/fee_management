// modules/website_management/controllers/enquiryController.js

const enquiryService = require('../services/enquiryService.js');

/** POST /api/website/enquiries — public */
async function submitEnquiry(req, res) {
  const { phone, message, enquiryTypeId } = req.body;
  const result = await enquiryService.submitEnquiry({ phone, message, enquiryTypeId });
  return res.status(result.success ? 201 : 400).json(result);
}

/** GET /api/website/enquiries — admin */
async function listEnquiries(req, res) {
  const { status, enquiryTypeId, search, page, pageSize } = req.query;
  const result = await enquiryService.listEnquiries({
    status,
    enquiryTypeId: enquiryTypeId ? Number(enquiryTypeId) : undefined,
    search,
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Number(pageSize) : 20,
  });
  return res.status(result.success ? 200 : 500).json(result);
}

/** PATCH /api/website/enquiries/:id/status — admin */
async function updateStatus(req, res) {
  const id = Number(req.params.id);
  const { status } = req.body;
  const result = await enquiryService.updateStatus(id, status, req.user);
  return res.status(result.success ? 200 : 400).json(result);
}

/** DELETE /api/website/enquiries/:id — admin */
async function deleteEnquiry(req, res) {
  const id = Number(req.params.id);
  const result = await enquiryService.deleteEnquiry(id, req.user);
  return res.status(result.success ? 200 : 400).json(result);
}

module.exports = { submitEnquiry, listEnquiries, updateStatus, deleteEnquiry };
