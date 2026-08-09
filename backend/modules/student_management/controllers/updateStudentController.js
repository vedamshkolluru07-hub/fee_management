const StudentService = require("../services/updateStudentService.js");

class StudentController {

    // =========================================================
    // UPDATE STUDENT DETAILS
    // =========================================================
    static async updateStudent(req, res) {
        try {
            const { student_id } = req.params;

            const result = await StudentService.updateStudent(
                student_id,
                req.body,
                req.user
            );

            return res.status(200).json({
                success: true,
                ...result
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // =========================================================
    // UPDATE PARENT DETAILS
    // =========================================================
    static async updateParent(req, res) {
        try {
            const { parents_id } = req.params;

            const result = await StudentService.updateParent(
                parents_id,
                req.body,
                req.user
            );

            return res.status(200).json({
                success: true,
                ...result
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // =========================================================
    // GET RELATIONS BY STUDENT ID
    // =========================================================
    static async getRelationsByStudentId(req, res) {
        try {
            const { student_id } = req.params;

            const result = await StudentService.getRelationsByStudentId(
                student_id
            );

            return res.status(200).json({
                success: true,
                ...result
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // =========================================================
    // GET RELATIONS BY PARENT ID
    // =========================================================
    static async getRelationsByParentId(req, res) {
        try {
            const { parents_id } = req.params;

            const result = await StudentService.getRelationsByParentId(
                parents_id
            );

            return res.status(200).json({
                success: true,
                ...result
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // =========================================================
    // DELETE STUDENT
    // =========================================================
    static async deleteStudent(req, res) {
        try {
            const { student_id } = req.params;

            const result = await StudentService.deleteStudent(student_id, req.user);

            return res.status(200).json({
                success: true,
                ...result
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = StudentController;