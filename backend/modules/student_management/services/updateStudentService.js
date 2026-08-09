const pool = require("../../../config/db.js");
const StudentRepository = require("../repositories/StudentRepository");
const ParentRepository = require("../repositories/ParentRepository");
const ParentStudentRepository = require("../repositories/ParentStudentRepository");
const {
    createAuditLogService
} = require("../../user_management/services/auditLogServiceCreate.js");

class StudentService {

    // =========================================================
    // 1. UPDATE STUDENT DETAILS
    // =========================================================
    static async updateStudent(student_id, updateData, actor = null) {
        const client = await pool.connect();

        try {
            if (!student_id) throw new Error("student_id is required");
            if (!updateData || Object.keys(updateData).length === 0) {
                throw new Error("No update data provided");
            }

            const allowedFields = StudentRepository.allowedUpdateFields;
            const filteredData = {};

            for (const key of allowedFields) {
                if (updateData[key] !== undefined) {
                    filteredData[key] = updateData[key];
                }
            }

            if (!Object.keys(filteredData).length) {
                throw new Error("No valid student fields to update");
            }

            const result = await StudentRepository.update(
                student_id,
                filteredData,
                client
            );

            if (!result) throw new Error("Student not found or update failed");

            await createAuditLogService({
                actor_user_id: actor?.user_id || null,
                action: "UPDATE_STUDENT",
                category: "update",
                log_message: `Student ${student_id} updated`,
                target_entity_type: "student",
                changes: filteredData,
                success: true
            });

            return {
                message: "Student updated successfully",
                data: result
            };

        } catch (err) {
            await createAuditLogService({
                actor_user_id: actor?.user_id || null,
                action: "UPDATE_STUDENT",
                category: "update",
                log_message: `Failed to update student ${student_id}: ${err.message}`,
                target_entity_type: "student",
                success: false,
                severity: "warning"
            });
            throw err;

        } finally {
            client.release();
        }
    }

    // =========================================================
    // 2. UPDATE PARENT DETAILS
    // =========================================================
    static async updateParent(parents_id, updateData, actor = null) {
        const client = await pool.connect();

        try {
            if (!parents_id) throw new Error("parents_id is required");
            if (!updateData || Object.keys(updateData).length === 0) {
                throw new Error("No update data provided");
            }

            const result = await ParentRepository.updateParent(
                parents_id,
                updateData,
                client
            );

            if (!result) throw new Error("Parent not found or update failed");

            await createAuditLogService({
                actor_user_id: actor?.user_id || null,
                action: "UPDATE_PARENT",
                category: "update",
                log_message: `Parent ${parents_id} updated`,
                target_entity_type: "student",
                changes: updateData,
                success: true
            });

            return {
                message: "Parent updated successfully",
                data: result
            };

        } catch (err) {
            await createAuditLogService({
                actor_user_id: actor?.user_id || null,
                action: "UPDATE_PARENT",
                category: "update",
                log_message: `Failed to update parent ${parents_id}: ${err.message}`,
                target_entity_type: "student",
                success: false,
                severity: "warning"
            });
            throw err;

        } finally {
            client.release();
        }
    }

    // =========================================================
    // 3. GET RELATIONS BY STUDENT ID
    // =========================================================
    static async getRelationsByStudentId(student_id) {
        if (!student_id) throw new Error("student_id is required");

        const relations = await ParentStudentRepository.getRelationsByStudentId(
            student_id
        );

        return {
            message: "Relations fetched successfully",
            data: relations
        };
    }

    // =========================================================
    // 4. GET RELATIONS BY PARENT ID
    // =========================================================
    static async getRelationsByParentId(parents_id) {
        if (!parents_id) throw new Error("parents_id is required");

        const relations = await ParentStudentRepository.getRelationsByParentId(
            parents_id
        );

        return {
            message: "Relations fetched successfully",
            data: relations
        };
    }

    // =========================================================
    // 5. DELETE STUDENT (CASCADE SAFE)
    // =========================================================
    static async deleteStudent(student_id, actor = null) {
        const client = await pool.connect();

        try {
            if (!student_id) throw new Error("student_id is required");

            await client.query("BEGIN");

            // FIXED: correct parameter order (student_id first)
            await ParentStudentRepository.deleteRelation(
                null,
                student_id,
                client
            );

            const deleted = await StudentRepository.delete(student_id, client);

            if (!deleted) throw new Error("Student not found");

            await client.query("COMMIT");

            await createAuditLogService({
                actor_user_id: actor?.user_id || null,
                action: "DELETE_STUDENT",
                category: "delete",
                log_message: `Student ${student_id} deleted`,
                target_entity_type: "student",
                success: true,
                severity: "critical"
            });

            return {
                message: "Student deleted successfully",
                data: deleted
            };

        } catch (error) {
            await client.query("ROLLBACK");

            await createAuditLogService({
                actor_user_id: actor?.user_id || null,
                action: "DELETE_STUDENT",
                category: "delete",
                log_message: `Failed to delete student ${student_id}: ${error.message}`,
                target_entity_type: "student",
                success: false,
                severity: "warning"
            });

            throw error;

        } finally {
            client.release();
        }
    }
}

module.exports = StudentService;