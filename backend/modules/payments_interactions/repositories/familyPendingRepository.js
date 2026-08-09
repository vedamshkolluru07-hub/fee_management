// modules/payments_interactions/repositories/familyPendingRepository.js
const pool = require('../../../config/db.js');

// NOTE: requires migration 004_fk_target_and_due_date_fix.sql to have
// been run (adds payments.due_date, which this query reads).
//
// NOTE (row multiplication): the final SELECT joins parentstudents/
// parents directly off each student, not off the family-scoped
// related_parents CTE. If a student has two linked parents (e.g.
// father + mother), that student's payment/books/uniform row will
// appear twice — once per parent. Left as-is since this may be
// intentional (surfacing both parents' contact info per row); if you
// want one row per student instead, aggregate the parent columns
// (e.g. json_agg) rather than joining them in directly.
async function fetchFamilyPendingRows(studentId) {
  const client = await pool.connect();

  try {
    const query = `
      WITH related_parents AS (
        SELECT DISTINCT ps.parents_id
        FROM parentstudents ps
        WHERE ps.student_id = $1
      ),

      related_students AS (
        SELECT DISTINCT ps.student_id
        FROM parentstudents ps
        INNER JOIN related_parents rp
          ON rp.parents_id = ps.parents_id
      ),

      payment_base AS (
        SELECT
          sc.payment_id,
          sc.student_id,
          sc.class_id,
          sc.academic_year_id,

          p.total_amount_paid,
          p.pending_amount AS total_amount_pending,
          p.payment_status,
          p.due_date,

          CASE
            WHEN COALESCE(p.pending_amount, 0) > 0 THEN TRUE
            ELSE FALSE
          END AS payment_pending

        FROM student_classes sc
        INNER JOIN payments p
          ON p.payment_id = sc.payment_id

        -- enforce family scope here
        INNER JOIN related_students rs
          ON rs.student_id = sc.student_id
      ),

      latest_transactions AS (
        SELECT DISTINCT ON (t.payment_id)
          t.payment_id,
          t.transaction_id,
          t.amount_paid,
          t.remarks,
          t.payment_date,
          t.payment_method
        FROM transactions t
        ORDER BY t.payment_id, t.payment_date DESC
      ),

      books_pending AS (
        SELECT
          bp.payment_id,
          SUM(COALESCE(bp.books_pending_amount, 0)) AS total_books_pending
        FROM bookspayments bp
        GROUP BY bp.payment_id
      ),

      uniform_pending AS (
        SELECT
          up.payment_id,
          SUM(COALESCE(up.uniform_pending_amount, 0)) AS total_uniform_pending
        FROM uniformpayments up
        GROUP BY up.payment_id
      )

      SELECT
        s.student_id,
        s.student_name,
        s.sur_name,
        s.name_vector,
        s.dob,
        s.gender,
        s.section,
        s.email_id,
        s.admission_date,
        s.is_connected,
        s.status,

        p.parents_id,
        p.contact_number,
        p.secondary_contact_number,
        p.fathers_first_name,
        p.fathers_sur_name,
        p.mothers_first_name,
        p.mothers_sur_name,
        p.email AS parent_email,
        p.address,
        p.occupation,
        p.is_connected AS parent_is_connected,

        pb.class_id,
        pb.academic_year_id,
        pb.payment_id,
        pb.total_amount_paid,
        pb.total_amount_pending,
        pb.payment_status,
        pb.due_date,
        pb.payment_pending,

        COALESCE(bp.total_books_pending, 0) AS books_pending,
        COALESCE(up.total_uniform_pending, 0) AS uniform_pending,

        lt.transaction_id,
        lt.amount_paid AS last_transaction_amount,
        lt.remarks AS last_transaction_remarks,
        lt.payment_date AS last_transaction_date,
        lt.payment_method AS last_transaction_method

      FROM payment_base pb

      INNER JOIN students s
        ON s.student_id = pb.student_id

      INNER JOIN parentstudents ps
        ON ps.student_id = s.student_id

      INNER JOIN parents p
        ON p.parents_id = ps.parents_id

      LEFT JOIN latest_transactions lt
        ON lt.payment_id = pb.payment_id

      LEFT JOIN books_pending bp
        ON bp.payment_id = pb.payment_id

      LEFT JOIN uniform_pending up
        ON up.payment_id = pb.payment_id

      ORDER BY s.student_name ASC, pb.academic_year_id DESC;
    `;

    const { rows } = await client.query(query, [studentId]);
    return rows;

  } finally {
    client.release();
  }
}

module.exports = {
  fetchFamilyPendingRows
};