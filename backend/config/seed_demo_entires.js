//seed_demo_entires

const pool = require('../config/db');

async function seedDemoEntries() {
  console.log('🌱 Seeding TRAIL DATA (Large relational dataset)...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ================= ACADEMIC YEARS (3) =================
    await client.query(`
      INSERT INTO AcademicYears (year_label, start_date, end_date, is_current_year)
      VALUES
      ('2023-2024', '2023-06-01', '2024-04-30', FALSE),
      ('2024-2025', '2024-06-01', '2025-04-30', FALSE),
      ('2025-2026', '2025-06-01', '2026-04-30', TRUE)
      ON CONFLICT (year_label) DO NOTHING;
    `);

    const yearsRes = await client.query(
      `SELECT academic_year_id FROM AcademicYears ORDER BY academic_year_id`
    );

    if (yearsRes.rows.length < 3) {
      throw new Error('AcademicYears seeding failed or incomplete');
    }

    const [y1, y2, y3] = yearsRes.rows.map(r => r.academic_year_id);
    const yearsArr = [y1, y2, y3];

    // ================= CLASSES (13 × 3 = 39) =================
    const classNames = [
      'Class 1','Class 2','Class 3','Class 4','Class 5',
      'Class 6','Class 7','Class 8','Class 9','Class 10',
      'Class 11','Class 12','Class 13'
    ];

    for (const year of yearsArr) {
      for (let i = 0; i < classNames.length; i++) {
        await client.query(`
          INSERT INTO Classes (academic_year_id, class_name, fee_amount)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING;
        `, [year, classNames[i], 20000 + i * 500]);
      }
    }

    const classesRes = await client.query(`SELECT * FROM Classes`);
    const classList = classesRes.rows;

    // ================= BOOKS =================
    const bookTypes = ['Textbook', 'Notebook Set', 'Reference Pack'];

    for (const cls of classList) {
      for (const type of bookTypes) {
        await client.query(`
          INSERT INTO Books (class_id, books_type, books_amount)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING;
        `, [cls.class_id, type, 500 + Math.floor(Math.random() * 500)]);
      }
    }

    // ================= UNIFORMS =================
    const uniformTypes = ['Shirt-Pant', 'Shirt-Skirt', 'Sports Kit'];
    const genders = ['Male', 'Female'];

    for (const year of yearsArr) {
      for (const type of uniformTypes) {
        for (const gender of genders) {
          await client.query(`
            INSERT INTO Uniform (academic_year_id, gender, uniform_type, size, uniform_amount)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT DO NOTHING;
          `, [
            year,
            gender,
            type,
            'M',
            1200 + Math.floor(Math.random() * 800)
          ]);
        }
      }
    }

    // ================= PARENTS (22 households) =================
    const parents = [];

    for (let i = 1; i <= 22; i++) {
      const res = await client.query(`
        INSERT INTO Parents (
          contact_number,
          parents_name,
          mothers_name,
          email,
          address,
          occupation
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT DO NOTHING
        RETURNING parents_id;
      `, [
        String(9000000000 + i), // FIXED: valid 10-digit number
        `Father_${i}`,
        `Mother_${i}`,
        `family${i}@mail.com`,
        `City Block ${i}`,
        'Employee'
      ]);

      if (res.rows[0]) {
        parents.push(res.rows[0].parents_id);
      }
    }

    if (parents.length === 0) {
      const fallback = await client.query(`SELECT parents_id FROM Parents LIMIT 22`);
      parents.push(...fallback.rows.map(r => r.parents_id));
    }

    // ================= STUDENTS (40 + siblings logic) =================
    const students = [];

    for (let i = 1; i <= 40; i++) {
      const parentIndex = Math.floor((i - 1) / 2); // siblings share parents
      const parentId = parents[parentIndex % parents.length];

      const studentId = `STU${String(i).padStart(3, '0')}`;

      await client.query(`
        INSERT INTO Students (
          student_id,
          student_name,
          dob,
          gender,
          section,
          email_id,
          admission_date,
          status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT DO NOTHING;
      `, [
        studentId,
        `Student_${i}`,
        '2010-01-01',
        i % 2 === 0 ? 'Male' : 'Female',
        i % 2 === 0 ? 'A' : 'B',
        `${studentId.toLowerCase()}@school.com`,
        '2023-06-01',
        'Active'
      ]);

      students.push(studentId);

      await client.query(`
        INSERT INTO ParentStudents (parents_id, student_id, relationship)
        VALUES ($1,$2,'Father')
        ON CONFLICT DO NOTHING;
      `, [parentId, studentId]);
    }

    // ================= STUDENT CLASSES + PAYMENTS =================
    const classList2 = (await client.query(
      `SELECT class_id, academic_year_id FROM Classes`
    )).rows;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const cls = classList2[i % classList2.length];

      await client.query(`
        INSERT INTO StudentClasses (student_id, class_id, academic_year_id)
        VALUES ($1,$2,$3)
        ON CONFLICT DO NOTHING;
      `, [student, cls.class_id, cls.academic_year_id]);

      const payment = await client.query(`
        INSERT INTO Payments (
          student_id,
          class_id,
          academic_year_id,
          total_amount_paid,
          total_amount_pending,
          payment_status,
          due_date
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING payment_id;
      `, [
        student,
        cls.class_id,
        cls.academic_year_id,
        Math.floor(Math.random() * 20000),
        Math.floor(Math.random() * 10000),
        'Pending',
        '2026-03-01'
      ]);

      const paymentId = payment.rows[0].payment_id;

      await client.query(`
        INSERT INTO Transactions (
          transaction_id,
          payment_id,
          amount_paid,
          remarks,
          payment_date,
          payment_method
        )
        VALUES ($1,$2,$3,$4,NOW(),$5)
        ON CONFLICT DO NOTHING;
      `, [
        `TXN_${student}`,
        paymentId,
        5000,
        'tution',
        'Online'
      ]);
    }

    await client.query('COMMIT');
    console.log('✅ Large seed completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
  } finally {
    client.release();
  }
}

module.exports = seedDemoEntries;