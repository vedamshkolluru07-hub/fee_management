const pool = require('../../../config/db.js');

async function getStudentFullDataByAcademicYearRepo({
  academic_year_id,
  conditions = [],
  params = [],
  transactionLimit = 10,
  transactionOffset = 0,
}) {
  const client = await pool.connect();

  try {
    const baseQuery = `
      SELECT 
        sc.student_id,
        sc.class_id,
        sc.academic_year_id,

        s.student_name,
        s.sur_name,
        s.dob,
        s.gender,
        s.section,
        s.email_id,
        s.admission_date,
        s.is_connected,
        s.status,

        c.class_name,
        c.fee_amount,

        pay.payment_id,
        pay.concession,
        pay.total_amount_paid,
        pay.pending_amount,
        pay.payment_status,
        pay.due_date,

        COALESCE(tx.transactions, '[]') AS tuition_transactions,
        COALESCE(books.books_payments, '[]') AS books_payments,
        COALESCE(uniforms.uniform_payments, '[]') AS uniform_payments,

        par.parents_id,
        par.fathers_first_name,
        par.fathers_sur_name,
        par.mothers_first_name,
        par.mothers_sur_name,
        par.contact_number,
        par.secondary_contact_number,
        par.email,
        par.address,
        par.occupation

      FROM student_classes sc

      JOIN students s 
        ON s.student_id = sc.student_id

      JOIN classes c 
        ON c.class_id = sc.class_id

      LEFT JOIN payments pay 
        ON pay.payment_id = sc.payment_id

      -- FIXED TRANSACTIONS LATERAL (no outer LIMIT/OFFSET binding issue)
      LEFT JOIN LATERAL (
        SELECT COALESCE(
          json_agg(t ORDER BY t.payment_date DESC),
          '[]'
        ) AS transactions
        FROM (
          SELECT 
            transaction_id,
            amount_paid,
            payment_date,
            remarks,
            payment_method
          FROM transactions
          WHERE payment_id = sc.payment_id
            AND remarks = 'tuition'
          ORDER BY payment_date DESC
          LIMIT $1 OFFSET $2
        ) t
      ) tx ON true

      LEFT JOIN LATERAL (
        SELECT COALESCE(json_agg(bp), '[]') AS books_payments
        FROM bookspayments bp
        WHERE bp.payment_id = sc.payment_id
      ) books ON true

      LEFT JOIN LATERAL (
        SELECT COALESCE(json_agg(up), '[]') AS uniform_payments
        FROM uniformpayments up
        WHERE up.payment_id = sc.payment_id
      ) uniforms ON true

      LEFT JOIN LATERAL (
        SELECT 
          pr.parents_id,
          pr.fathers_first_name,
          pr.fathers_sur_name,
          pr.mothers_first_name,
          pr.mothers_sur_name,
          pr.contact_number,
          pr.secondary_contact_number,
          pr.email,
          pr.address,
          pr.occupation
        FROM parentstudents ps
        JOIN parents pr 
          ON pr.parents_id = ps.parents_id
        WHERE ps.student_id = sc.student_id
        ORDER BY (ps.relationship = 'Father') DESC
        LIMIT 1
      ) par ON true

      WHERE sc.academic_year_id = $3
    `;

    let query = baseQuery;

    if (conditions.length > 0) {
      query += ` AND ` + conditions.join(' AND ');
    }

    const finalParams = [
      transactionLimit,   // $1
      transactionOffset,  // $2
      academic_year_id,   // $3
      ...params,           // $4+
    ];

    const result = await client.query(query, finalParams);
    return result.rows;

  } finally {
    client.release();
  }
}

module.exports = {
  getStudentFullDataByAcademicYearRepo,
};