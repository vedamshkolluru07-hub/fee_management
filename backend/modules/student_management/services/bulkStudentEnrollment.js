const { createStudentEnrollment } = require("./studentEnrollmentService");
const {
  createAuditLogService
} = require("../../user_management/services/auditLogServiceCreate.js");

// ================= BULK PROCESS (OPTIMIZED + DEBUG) =================
const processBulkStudents = async (students, actor = null) => {
  const startTime = Date.now();

  console.log("========== BULK PROCESS START ==========");
  console.log("Total students received:", students.length);
  console.log("First student sample:", students[0]);

  const inserted = [];
  const failed = [];

  const BATCH_SIZE = 5;

  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = students.slice(i, i + BATCH_SIZE);

    console.log("----------------------------------------");
    console.log("Processing batch:", {
      startIndex: i,
      batchSize: batch.length,
    });

    console.log("Batch data:", batch);

    const results = await Promise.allSettled(
      batch.map(async (student, batchIndex) => {

        console.log("Calling createStudentEnrollment");
        console.log("Student index:", i + batchIndex);
        console.log("Student payload:", student);

        const result = await createStudentEnrollment(student, actor);

        console.log("Enrollment result:");
        console.log(result);

        return {
          result,
          student,
        };
      })
    );

    results.forEach((res, index) => {
      const globalIndex = i + index;

      console.log("Processing result for index:", globalIndex);

      if (res.status === "fulfilled") {
        const { result, student } = res.value;

        if (result.success) {

          console.log("SUCCESS:", {
            index: globalIndex,
            student_id: result.data.student_id,
            payment_id: result.data.payment_id,
          });

          inserted.push({
            index: globalIndex,
            student_id: result.data.student_id,
            payment_id: result.data.payment_id,
          });

        } else {

          console.log("FAILED FROM SERVICE:", {
            index: globalIndex,
            message: result.message,
            student,
          });

          failed.push({
            index: globalIndex,
            ...student,
            error: result.message,
          });
        }

      } else {

        console.log("PROMISE FAILED:", {
          index: globalIndex,
          error: res.reason,
        });

        failed.push({
          index: globalIndex,
          error: res.reason?.message || "Unknown error",
        });
      }
    });
  }

  const totalTimeSec = (Date.now() - startTime) / 1000;

  const avgTimePerStudent =
    students.length > 0
      ? totalTimeSec / students.length
      : 0;


  const response = {
    inserted,
    failed,
    metrics: {
      total_time_sec: totalTimeSec,
      avg_time_per_student_sec: avgTimePerStudent,
      total_students: students.length,
    },
  };


  console.log("========== BULK PROCESS COMPLETE ==========");
  console.log("Final response:", response);

  // Note: each successful enrollment above already logged its own
  // CREATE_STUDENT_ENROLLMENT entry via createStudentEnrollment().
  // This is a summary-level record of the bulk operation itself.
  await createAuditLogService({
    actor_user_id: actor?.user_id || null,
    action: "BULK_ENROLL_STUDENTS",
    category: "create",
    log_message: `Bulk enrollment processed: ${inserted.length} succeeded, ${failed.length} failed out of ${students.length}`,
    target_entity_type: "student",
    changes: { insertedCount: inserted.length, failedCount: failed.length, totalStudents: students.length },
    success: failed.length === 0,
    severity: failed.length > 0 ? "warning" : "info"
  });

  return response;
};


module.exports = {
  processBulkStudents,
};