// src/modules/academics/controllers/cascadeDelete.controller.js

const { cascadeDelete } = require('../services/deleteActionService.js');

/**
 * =========================================================
 * CASCADE DELETE CONTROLLER
 * =========================================================
 *
 * Handles deletion flow for:
 * - Academic Years
 * - Classes
 * - Books
 * - Uniforms
 *
 * Supports:
 * - Soft validation via connection flags
 * - Force delete mode
 * - Automatic dependency expansion
 *
 * REQUEST BODY:
 * {
 *   academicYearIds?: number[],
 *   classIds?: number[],
 *   bookIds?: number[],
 *   uniformIds?: number[],
 *   forceDelete?: boolean
 * }
 *
 * RESPONSE:
 * {
 *   success: boolean,
 *   message: string,
 *   deleted: {...},
 *   blocked: {...},
 *   debug?: [...]
 * }
 */
async function handleCascadeDelete(req, res) {
  try {
    // ================= EXTRACT BODY =================
    const {
      academicYearIds = [],
      classIds = [],
      bookIds = [],
      uniformIds = [],
      forceDelete = false
    } = req.body || {};

    // ================= VALIDATION =================

    const isValidArray = (arr) =>
      Array.isArray(arr) &&
      arr.every(id => Number.isInteger(id) && id > 0);

    if (
      !isValidArray(academicYearIds) ||
      !isValidArray(classIds) ||
      !isValidArray(bookIds) ||
      !isValidArray(uniformIds)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'All ID fields must be arrays of positive integers'
      });
    }

    // Prevent empty delete request
    const hasIds =
      academicYearIds.length ||
      classIds.length ||
      bookIds.length ||
      uniformIds.length;

    if (!hasIds) {
      return res.status(400).json({
        success: false,
        message: 'At least one ID is required for deletion'
      });
    }

    // ================= SERVICE CALL =================
    const result = await cascadeDelete({
      academicYearIds,
      classIds,
      bookIds,
      uniformIds,
      forceDelete: Boolean(forceDelete),
      actor: req.user
    });

    // ================= HANDLE FAILURE =================
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Cascade delete failed',
        error: result.error,
        debug: result.debug
      });
    }

    // ================= RESPONSE SUMMARY =================
    const deletedCount =
      result.deleted.books.length +
      result.deleted.uniforms.length +
      result.deleted.classes.length +
      result.deleted.academicYears.length;

    const blockedCount =
      result.blocked.books.length +
      result.blocked.uniforms.length +
      result.blocked.classes.length +
      result.blocked.academicYears.length;

    // ================= SUCCESS RESPONSE =================
    return res.status(200).json({
      success: true,
      message:
        deletedCount > 0
          ? 'Cascade delete completed successfully'
          : 'No records were deleted',

      summary: {
        deletedCount,
        blockedCount,
        forceDelete: Boolean(forceDelete)
      },

      deleted: result.deleted,
      blocked: result.blocked,

      debug: result.debug
    });

  } catch (err) {
    console.error('Cascade Delete Controller Error:', err);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: err.message
    });
  }
}

module.exports = {
  handleCascadeDelete
};