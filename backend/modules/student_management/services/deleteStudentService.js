// services/deleteStudentService.js

const StudentRepository = require("../repositories/studentRepository.js");
const ParentRepository = require("../repositories/parentRepository.js");
const ParentStudentRepository = require("../repositories/parentStudentRepository.js");
const pool = require("../../../config/db.js");
const {
  createAuditLogService
} = require("../../user_management/services/auditLogServiceCreate.js");

const deleteStudentService = async (studentId, actor = null) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Get all parent relations for this student
    const relations = await ParentStudentRepository.getRelationsByStudentId(
      studentId
    );

    const parentIds = [...new Set(relations.map(r => r.parents_id))];

    // 2. Delete student (ParentStudents will auto-delete via CASCADE)
    const deletedStudent = await StudentRepository.delete(studentId, client);

    if (!deletedStudent) {
      throw new Error("Student not found");
    }

    // 3. Check each parent if still linked to any other student
    for (const parentId of parentIds) {
      const parentRelations =
        await ParentStudentRepository.getRelationsByParentId(parentId, client);

      // 4. If no more student links exist → delete parent
      if (!parentRelations || parentRelations.length === 0) {
        await ParentRepository.deleteParent(parentId, client);
      }
    }

    await client.query("COMMIT");

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "DELETE_STUDENT",
      category: "delete",
      log_message: `Student ${studentId} (and orphaned parents) deleted`,
      target_entity_type: "student",
      changes: { studentId, orphanedParentIds: parentIds },
      success: true,
      severity: "warning"
    });

    return {
      success: true,
      message: "Student and orphan parents deleted successfully",
      data: deletedStudent
    };

  } catch (error) {
    await client.query("ROLLBACK");

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "DELETE_STUDENT",
      category: "delete",
      log_message: `Failed to delete student ${studentId}: ${error.message}`,
      target_entity_type: "student",
      success: false,
      severity: "warning"
    });

    throw error;

  } finally {
    client.release();
  }
};

module.exports = deleteStudentService;