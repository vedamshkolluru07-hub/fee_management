const { promoteStudents } = require('../services/promoteStudentService.js');

// ================= CONTROLLER =================
async function promoteStudentsController(req, res) {
  try {
    const {
      prevYearId,
      studentIds,
      studentStatusMap,
      doublePromotions
    } = req.body;

    // basic validation
    // NOTE: nextYearId is no longer accepted from the client — the
    // service now resolves it server-side from prevYearId via start_date.
    if (!prevYearId || !Array.isArray(studentIds)) {
      return res.status(400).json({
        success: false,
        message: 'prevYearId and studentIds are required'
      });
    }

    if (studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'studentIds cannot be empty'
      });
    }

    const result = await promoteStudents(
      prevYearId,
      studentIds,
      studentStatusMap || {},
      doublePromotions || {},
      req.user
    );

    return res.status(200).json({
      success: true,
      message: result.message || 'Promotion completed successfully',
      data: result.results
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  }
}

module.exports = {
  promoteStudentsController
};