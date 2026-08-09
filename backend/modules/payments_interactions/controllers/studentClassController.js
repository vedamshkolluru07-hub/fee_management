const studentClassesService = require("../services/studentClassService.js");

async function getPaymentId(req, res) {
  try {
    const { academic_year_id, class_id, student_id } = req.body;

    if (!academic_year_id || !class_id || !student_id) {
      return res.status(400).json({
        success: false,
        message: "academic_year_id, class_id and student_id are required",
      });
    }

    const result = await studentClassesService.getPaymentId(
      academic_year_id,
      class_id,
      student_id
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return res.status(404).json({
      success: false,
      message: err.message,
    });
  }
}

module.exports = {
  getPaymentId,
};