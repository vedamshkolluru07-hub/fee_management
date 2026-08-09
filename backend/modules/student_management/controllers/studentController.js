const {
  getStudentFullDataByAcademicYear,
} = require('../services/getStudentService.js');

async function getStudentsByAcademicYear(req, res) {
  try {
    const { academic_year_id } = req.params;

    // Basic validation (important fix)
    if (!academic_year_id) {
      return res.status(400).json({
        success: false,
        message: 'academic_year_id is required',
      });
    }

    const filters = {
      class_id: req.query.class_id
        ? req.query.class_id.split(',').map(Number)
        : undefined,

      section: req.query.section
        ? req.query.section.split(',')
        : undefined,

      status: req.query.status
        ? req.query.status.split(',')
        : undefined,

      payment_status: req.query.payment_status
        ? req.query.payment_status.split(',')
        : undefined,

      student_name: req.query.student_name || undefined,
      parent_name: req.query.parent_name || undefined,
    };

    const data = await getStudentFullDataByAcademicYear(
      academic_year_id,
      filters
    );

    return res.status(200).json({
      success: true,
      message: 'Students fetched successfully',
      data,
    });
  } catch (error) {
    console.error('Controller Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
}

module.exports = {
  getStudentsByAcademicYear,
};