// modules/website_management/services/enquiryService.js

const repo = require('../repositories/enquiryRepository.js');
const enquiryTypeRepo = require('../repositories/enquiryTypeRepository.js');
const { createAuditLogService } = require('../../user_management/services/auditLogServiceCreate.js');

const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
const VALID_STATUSES = new Set(['new', 'in_progress', 'resolved']);

/**
 * ======================================================
 * 🔹 SUBMIT (public)
 * ======================================================
 */
async function submitEnquiry({ phone, message, enquiryTypeId }) {
  if (!phone || !PHONE_REGEX.test(phone)) {
    return { success: false, message: 'A valid phone number is required' };
  }
  if (!message || !message.trim()) {
    return { success: false, message: 'Message is required' };
  }
  if (!enquiryTypeId) {
    return { success: false, message: 'enquiryTypeId is required' };
  }

  const typeResult = await enquiryTypeRepo.findById(enquiryTypeId);
  if (!typeResult.success || !typeResult.data || !typeResult.data.is_active) {
    return { success: false, message: 'Invalid enquiry type' };
  }

  return repo.create({ phone: phone.trim(), message: message.trim(), enquiryTypeId });
}

/**
 * ======================================================
 * 🔹 LIST (admin)
 * ======================================================
 */
async function listEnquiries(filters) {
  return repo.findAll(filters);
}

/**
 * ======================================================
 * 🔹 UPDATE STATUS (admin)
 * ======================================================
 */
async function updateStatus(id, status, actor) {
  if (!VALID_STATUSES.has(status)) {
    return { success: false, message: 'Invalid status' };
  }

  const result = await repo.updateStatus(id, status);

  if (result.success && actor?.user_id) {
    await createAuditLogService({
      actor_user_id: actor.user_id,
      action: 'ENQUIRY_STATUS_UPDATE',
      category: 'website_management',
      log_message: `Enquiry #${id} status set to ${status}`,
      target_entity_type: 'enquiry',
      changes: { status },
    });
  }

  return result;
}

/**
 * ======================================================
 * 🔹 SOFT DELETE (admin)
 * ======================================================
 */
async function deleteEnquiry(id, actor) {
  const result = await repo.softDelete(id);

  if (result.success && actor?.user_id) {
    await createAuditLogService({
      actor_user_id: actor.user_id,
      action: 'ENQUIRY_DELETE',
      category: 'website_management',
      log_message: `Enquiry #${id} soft-deleted`,
      target_entity_type: 'enquiry',
      severity: 'warning',
    });
  }

  return result;
}

module.exports = { submitEnquiry, listEnquiries, updateStatus, deleteEnquiry };
