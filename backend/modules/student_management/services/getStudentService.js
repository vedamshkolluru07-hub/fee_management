const {
  getStudentFullDataByAcademicYearRepo,
} = require('../repositories/getStudentRepository.js');

async function getStudentFullDataByAcademicYear(
  academic_year_id,
  filters = {}
) {
  const {
    class_id,
    section,
    status,
    payment_status,
    student_name,
    parent_name,
  } = filters;

  const conditions = [];
  const params = [];

  // helper to compute correct placeholder index
  const placeholder = () => `$${params.length + 1 + 3}`;

  // CLASS FILTER
  if (class_id) {
    conditions.push(`sc.class_id = ANY($${params.length + 4}::int[])`);
    params.push(Array.isArray(class_id) ? class_id : [class_id]);
  }

  if (section) {
    conditions.push(`s.section = ANY($${params.length + 4}::text[])`);
    params.push(Array.isArray(section) ? section : [section]);
  }

  if (status) {
    conditions.push(`s.status = ANY($${params.length + 4}::text[])`);
    params.push(Array.isArray(status) ? status : [status]);
  }

  if (student_name) {
    conditions.push(`
      (
        s.student_name ILIKE $${params.length + 4}
        OR s.sur_name ILIKE $${params.length + 4}
        OR (s.student_name || ' ' || s.sur_name) ILIKE $${params.length + 4}
      )
    `);
    params.push(`%${student_name}%`);
  }

  if (parent_name) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM parentstudents ps
        JOIN parents p ON p.parents_id = ps.parents_id
        WHERE ps.student_id = sc.student_id
          AND (
            p.fathers_first_name ILIKE $${params.length + 4}
            OR p.fathers_sur_name ILIKE $${params.length + 4}
            OR p.mothers_first_name ILIKE $${params.length + 4}
            OR p.mothers_sur_name ILIKE $${params.length + 4}
            OR (p.fathers_first_name || ' ' || p.fathers_sur_name) ILIKE $${params.length + 4}
            OR (p.mothers_first_name || ' ' || p.mothers_sur_name) ILIKE $${params.length + 4}
          )
      )
    `);
    params.push(`%${parent_name}%`);
  }

  if (payment_status) {
    conditions.push(`pay.payment_status = ANY($${params.length + 4}::text[])`);
    params.push(
      Array.isArray(payment_status) ? payment_status : [payment_status]
    );
  }

  const rows = await getStudentFullDataByAcademicYearRepo({
    academic_year_id,
    conditions,
    params,
  });

  const finalData = rows.map((row) => ({
    academic_year_id: row.academic_year_id,

    student: {
      student_id: row.student_id,
      student_name: row.student_name,
      sur_name: row.sur_name,
      dob: row.dob,
      gender: row.gender,
      section: row.section,
      email_id: row.email_id,
      admission_date: row.admission_date,
      status: row.status,
      is_connected: row.is_connected,
    },

    class: {
      class_id: row.class_id,
      class_name: row.class_name,
      fee_amount: row.fee_amount,
    },

    payment: {
      payment_id: row.payment_id,
      concession: row.concession,
      total_amount_paid: row.total_amount_paid,
      pending_amount: row.pending_amount,
      payment_status: row.payment_status,
      due_date: row.due_date,

      tuition_transactions: row.tuition_transactions,
      booksPayments: row.books_payments,
      uniformPayments: row.uniform_payments,
    },

    parent: row.parents_id
      ? {
          parents_id: row.parents_id,
          fathers_first_name: row.fathers_first_name,
          fathers_sur_name: row.fathers_sur_name,
          mothers_first_name: row.mothers_first_name,
          mothers_sur_name: row.mothers_sur_name,
          contact_number: row.contact_number,
          secondary_contact_number: row.secondary_contact_number,
          email: row.email,
          address: row.address,
          occupation: row.occupation,
        }
      : null,
  }));

  return { students: finalData };
}

module.exports = {
  getStudentFullDataByAcademicYear,
};