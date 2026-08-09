const deleteStudentService = require("../services/deleteStudentService.js");

class StudentController {

    static async deleteStudent(req, res) {

        try {
            const { student_id } = req.params;

            if (!student_id) {
                return res.status(400).json({
                    success: false,
                    message: "student_id is required"
                });
            }

            const result = await deleteStudentService(student_id, req.user);

            return res.status(200).json({
                success: result.success,
                message: result.message,
                data: result.data
            });

        } catch (err) {

            console.error("Delete Student Error:", err);

            return res.status(500).json({
                success: false,
                message: err.message || "Internal Server Error"
            });
        }
    }
}

module.exports = StudentController;