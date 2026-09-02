const pool = require("../../../config/db.js");

const StudentRepository = require("../repositories/studentRepository");
const ParentRepository = require("../repositories/parentRepository");
const ParentStudentRepository = require("../repositories/ParentStudentRepository");

const studentClassesRepo = require("../../payments_interactions/repositories/studentClassRepository.js");
const tuitionTransactionsService = require("../../payments_interactions/services/tuitionTransactionsService.js");

const classRepo = require("../../academic_management/repositories/classes.repository.js");
const {
  createAuditLogService
} = require("../../user_management/services/auditLogServiceCreate.js");

// ================= HELPERS =================

const isEmpty = (v) =>
  v === undefined ||
  v === null ||
  (typeof v === "string" && v.trim() === "");

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ================= MAIN SERVICE =================

const createStudentEnrollment = async (payload = {}, actor = null) => {
  const client = await pool.connect();

  console.log("DEBUG: Incoming enrollment payload:", payload);

  try {
    await client.query("BEGIN");
    console.log("DEBUG: Transaction started");

    const {
      academic_year_id,
      class_id,
      student_id,
      student_name,
      dob,
      gender,
      section,
      email_id,
      admission_date,
      status,
      contact_number,
      fathers_first_name,
      fathers_sur_name,
      mothers_first_name,
      mothers_sur_name,
      secondary_contact_number,
      email,
      address,
      occupation,
      relationship,
      concession = 0,
      amount_paid,
      payment_method,
      due_date,
    } = payload;

    // ================= VALIDATION =================
    console.log("DEBUG: Validating required fields");

    const requiredFields = {
      academic_year_id,
      class_id,
      student_id,
      student_name,
      dob,
      gender,
      email_id,
      admission_date,
      status,
      contact_number,
      fathers_first_name,
      fathers_sur_name,
      relationship,
      amount_paid,
      payment_method,
    };

    const missing = Object.entries(requiredFields).find(([_, v]) =>
      isEmpty(v)
    );

    if (missing) {
      throw new Error(`${missing[0]} is required`);
    }

    console.log("DEBUG: Validation passed");

    // ================= STUDENT UPSERT =================
    await StudentRepository.upsertStudent(
      {
        student_id,
        student_name,
        sur_name: fathers_sur_name,
        dob,
        gender,
        section,
        email_id,
        admission_date,
        status,
        is_connected: false,
      },
      client
    );

    // ================= PARENT CHECK =================
    const existingParent = await ParentRepository.getParentByContact(
      contact_number || null,
      secondary_contact_number || null,
      client
    );

    let parents_id;

    if (existingParent) {
      parents_id = existingParent.parents_id;
    } else {
      const parent = await ParentRepository.upsertParent(
        {
          contact_number,
          fathers_first_name,
          fathers_sur_name,
          mothers_first_name,
          mothers_sur_name,
          secondary_contact_number,
          email,
          address,
          occupation,
          is_connected: true,
        },
        client
      );

      parents_id = parent.parents_id;
    }

    // ================= LINK PARENT-STUDENT =================
    await ParentStudentRepository.upsertRelation(
      {
        parents_id,
        student_id,
        relationship,
      },
      client
    );

    // ================= UPDATE STUDENT =================
    await StudentRepository.update(
      student_id,
      { is_connected: true },
      client
    );

    // ================= CLASS VALIDATION =================
    const classData = await classRepo.findById(
      class_id,
      client
    );

    if (!classData) {
      throw new Error("Class not found");
    }

    // ================= STUDENT CLASS =================
    const studentClassRows = await studentClassesRepo.create(
      {
        student_id,
        class_id,
        academic_year_id,
        is_connected: true,
      },
      client
    );

    const payment_id = studentClassRows?.[0]?.payment_id;

    if (!payment_id) {
      throw new Error("Failed to generate payment_id");
    }

    // ================= TUITION PAYMENT (same transaction) =================
    // Delegates to tuitionTransactionsService, which:
    //   1) inserts the 'tuition' transaction row (source-of-truth ledger)
    //   2) calls fn_handle_tuition to upsert/recalculate the payments
    //      aggregate row from that ledger + concession
    //   3) sets due_date on the payments row if one was provided
    //   4) re-reads the payments row so we can return live totals
    // Passing `client` here means this runs inside the SAME transaction
    // as the enrollment above — if either fails, both roll back together.
    const { payment: paymentData } = await tuitionTransactionsService.createTuitionTransaction(
      {
        student_id,
        class_id,
        academic_year_id,
        payment_method,
        amount_paid: toNumber(amount_paid),
        concession: toNumber(concession),
        payment_date: new Date(),
        due_date: due_date || null,
      },
      client
    );

    // ================= FINANCE FLAG =================
    const financeStatus = await classRepo.checkIsFinanceConnected(
      class_id,
      client
    );

    if (!financeStatus?.isFinanceConnected) {
      await classRepo.updateIsFinanceConnected(
        class_id,
        true,
        client
      );
    }

    // ================= COMMIT =================
    await client.query("COMMIT");

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "CREATE_STUDENT_ENROLLMENT",
      category: "create",
      log_message: `Student ${student_id} enrolled into class ${class_id} (year ${academic_year_id})`,
      target_entity_type: "student",
      changes: { student_id, class_id, academic_year_id, parents_id, payment_id },
      success: true
    });

    return {
      success: true,
      message: "Student enrollment created successfully",
      data: {
        academic_year_id,
        class_id,
        student_id,
        parents_id,
        payment_id,
        total_amount_paid: paymentData?.total_amount_paid || 0,
        pending_amount: paymentData?.pending_amount || 0,
        payment_status: paymentData?.payment_status || "PENDING",
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("DEBUG: Transaction failed:", error);

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: "CREATE_STUDENT_ENROLLMENT",
      category: "create",
      log_message: `Failed to enroll student: ${error.message}`,
      target_entity_type: "student",
      changes: { payload },
      success: false,
      severity: "warning"
    });

    return {
      success: false,
      message: error.message,
    };
  } finally {
    client.release();
    console.log("DEBUG: DB client released");
  }
};

module.exports = {
  createStudentEnrollment,
};