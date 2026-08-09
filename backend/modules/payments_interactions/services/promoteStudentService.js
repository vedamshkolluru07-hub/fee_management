const pool = require('../../../config/db.js');
const studentClassesRepo = require('../repositories/studentClassRepository.js');
const StudentRepository = require('../../student_management/repositories/studentRepository.js');
const {
  createAuditLogService
} = require('../../user_management/services/auditLogServiceCreate.js');

// ================= DEBUG LOGGER =================
// Toggle via env var so logs can be silenced in production without
// touching code (e.g. PROMOTE_DEBUG=false).
const DEBUG = process.env.PROMOTE_DEBUG !== 'false';

function log(...args) {
  if (DEBUG) console.log('[promoteStudents]', ...args);
}

// ================= CLASS ORDER =================
const classOrder = [
  'nursery', 'lkg', 'ukg',
  'class 1', 'class 2', 'class 3', 'class 4', 'class 5',
  'class 6', 'class 7', 'class 8', 'class 9', 'class 10'
];

const normalize = (v) => String(v || '').trim().toLowerCase();

const getNextClass = (cls, step = 1) => {
  const idx = classOrder.indexOf(normalize(cls));
  return idx === -1 ? null : classOrder[idx + step] || null;
};

// ================= RULE ENGINE =================
function decidePromotion({ status, currentClass, doublePromotion }) {
  if (status === 'inactive') return { action: 'deactivate' };

  if (status === 'failed') {
    // Detained: student stays in the SAME class, but still needs a
    // fresh enrollment row for nextYearId (see PROMOTION handling below).
    return { action: 'repeat', targetClass: currentClass };
  }

  if (currentClass?.toLowerCase() === 'class 10') {
    return { action: 'graduate' };
  }

  if (doublePromotion) {
    return {
      action: 'promote',
      targetClass: typeof doublePromotion === 'string'
        ? doublePromotion
        : getNextClass(currentClass, 2),
      mode: 'double'
    };
  }

  return {
    action: 'promote',
    targetClass: getNextClass(currentClass, 1),
    mode: 'normal'
  };
}

// ================= RESOLVE NEXT ACADEMIC YEAR =================
// FIX: previously nextYearId was trusted as-is from the caller/frontend,
// which silently assumes academic_year_id is assigned in chronological
// order. That's not guaranteed by the schema. This resolves the true
// "next" academic year by comparing start_date, so 2024-2025 always
// maps to whichever row is chronologically after it (e.g. 2025-2026),
// regardless of what numeric ID Postgres happened to assign.
async function resolveNextAcademicYear(prevYearId, client) {
  const prevRes = await client.query(
    `SELECT academic_year_id, year_label, start_date
     FROM academic_years
     WHERE academic_year_id = $1`,
    [prevYearId]
  );

  const prevYear = prevRes.rows[0];

  if (!prevYear) {
    throw new Error(`Academic year not found: ${prevYearId}`);
  }

  const nextRes = await client.query(
    `SELECT academic_year_id, year_label, start_date
     FROM academic_years
     WHERE start_date > $1
     ORDER BY start_date ASC
     LIMIT 1`,
    [prevYear.start_date]
  );

  const nextYear = nextRes.rows[0];

  if (!nextYear) {
    throw new Error(
      `No academic year found after "${prevYear.year_label}" (start_date: ${prevYear.start_date}). Create the next academic year first.`
    );
  }

  log('Resolved next academic year', {
    from: { id: prevYear.academic_year_id, label: prevYear.year_label },
    to: { id: nextYear.academic_year_id, label: nextYear.year_label }
  });

  return nextYear.academic_year_id;
}

// ================= SERVICE =================
// NOTE: nextYearId is no longer accepted as an input — it is always
// derived server-side from prevYearId via resolveNextAcademicYear().
// This removes the frontend/client as a source of truth for which
// academic year students get promoted into.
async function promoteStudents(
  prevYearId,
  studentIds = [],
  studentStatusMap = {},
  doublePromotions = {},
  actor = null
) {
  log('START', {
    prevYearId,
    studentCount: studentIds.length,
    studentIds,
    studentStatusMap,
    doublePromotions
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    log('Transaction started');

    // ================= RESOLVE NEXT YEAR (SERVER-SIDE) =================
    const nextYearId = await resolveNextAcademicYear(prevYearId, client);

    // ================= FETCH NEXT YEAR CLASSES =================
    const classesRes = await client.query(
      `SELECT class_id, class_name FROM classes WHERE academic_year_id = $1`,
      [nextYearId]
    );

    const classMap = new Map();
    for (const c of classesRes.rows) {
      classMap.set(normalize(c.class_name), c);
    }
    log('Next year classes loaded', {
      nextYearId,
      classCount: classesRes.rows.length,
      classNames: [...classMap.keys()]
    });

    if (!classesRes.rows.length) {
      throw new Error(
        `No classes exist for the next academic year (id: ${nextYearId}). Create classes for that year before promoting.`
      );
    }

    // ================= FETCH STUDENT CURRENT ENROLLMENTS =================
    const enrollRes = await client.query(
      `
      SELECT sc.student_id, c.class_name, sc.class_id
      FROM student_classes sc
      JOIN classes c ON c.class_id = sc.class_id
      WHERE sc.academic_year_id = $1
        AND sc.student_id = ANY($2)
      `,
      [prevYearId, studentIds]
    );

    const studentClassMap = new Map(
      enrollRes.rows.map(r => [String(r.student_id), r])
    );
    log('Prev year enrollments loaded', {
      prevYearId,
      found: enrollRes.rows.length,
      requested: studentIds.length
    });

    const missingFromPrevYear = studentIds.filter(
      id => !studentClassMap.has(String(id))
    );
    if (missingFromPrevYear.length) {
      log('WARNING: students with no prevYear enrollment, will be skipped', missingFromPrevYear);
    }

    // ================= FETCH EXISTING NEXT YEAR ENROLLMENTS =================
    const nextEnrollRes = await studentClassesRepo.getByAcademicYearId(nextYearId, client);

    const alreadyEnrolled = new Set(
      nextEnrollRes.map(r => String(r.student_id))
    );
    log('Existing next year enrollments loaded', {
      nextYearId,
      alreadyEnrolledCount: alreadyEnrolled.size
    });

    // ================= RESULT BUCKETS =================
    const inserts = [];
    const updates = [];
    const results = [];

    // ================= LOOP =================
    for (const studentId of studentIds) {
      const record = studentClassMap.get(String(studentId));

      if (!record) {
        log(`SKIP student=${studentId}: no enrollment record in prevYear ${prevYearId}`);
        continue;
      }

      if (alreadyEnrolled.has(String(studentId))) {
        log(`SKIP student=${studentId}: already enrolled in nextYear ${nextYearId}`);
        results.push({ studentId, status: 'already_exists' });
        continue;
      }

      const currentClass = record.class_name;
      const status = normalize(studentStatusMap[studentId] || 'active');

      const decision = decidePromotion({
        status,
        currentClass,
        doublePromotion: doublePromotions[studentId]
      });

      log(`DECISION student=${studentId}`, { currentClass, status, decision });

      // ================= DEACTIVATE =================
      if (decision.action === 'deactivate') {
        updates.push(
          StudentRepository.update(studentId, { status: 'Inactive' }, client)
        );

        results.push({ studentId, status: 'inactive' });
        log(`ACTION student=${studentId}: deactivate`);
        continue;
      }

      // ================= GRADUATE =================
      if (decision.action === 'graduate') {
        updates.push(
          StudentRepository.update(studentId, { status: 'Graduated' }, client)
        );

        results.push({ studentId, status: 'graduated' });
        log(`ACTION student=${studentId}: graduate (was ${currentClass})`);
        continue;
      }

      // ================= REPEAT (DETAIN) =================
      if (decision.action === 'repeat') {
        const target = classMap.get(normalize(decision.targetClass));

        if (!target) {
          log(`ERROR student=${studentId}: repeat target class missing in nextYear`, decision.targetClass);
          throw new Error(`Missing class in next year: ${decision.targetClass}`);
        }

        inserts.push([
          studentId,
          target.class_id,
          nextYearId,
          false
        ]);

        results.push({
          studentId,
          from: currentClass,
          to: decision.targetClass,
          mode: 'repeat'
        });
        log(`ACTION student=${studentId}: repeat/detain in ${decision.targetClass}`);
        continue;
      }

      // ================= PROMOTION =================
      const target = classMap.get(normalize(decision.targetClass));

      if (!target) {
        log(`ERROR student=${studentId}: promotion target class missing in nextYear`, decision.targetClass);
        throw new Error(`Missing class in next year: ${decision.targetClass}`);
      }

      inserts.push([
        studentId,
        target.class_id,
        nextYearId,
        false
      ]);

      results.push({
        studentId,
        from: currentClass,
        to: decision.targetClass,
        mode: decision.mode
      });
      log(`ACTION student=${studentId}: ${decision.mode} promote ${currentClass} -> ${decision.targetClass}`);
    }

    // ================= BATCH INSERT =================
    if (inserts.length) {
      const values = inserts
        .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
        .join(',');

      const flat = inserts.flat();

      log('Batch inserting enrollments', { count: inserts.length });

      await client.query(
        `
        INSERT INTO student_classes
        (student_id, class_id, academic_year_id, is_connected)
        VALUES ${values}
        `,
        flat
      );

      log('Batch insert complete');
    } else {
      log('No enrollment inserts needed');
    }

    // ================= RUN STATUS UPDATES =================
    log('Running status updates', { count: updates.length });
    await Promise.all(updates);
    log('Status updates complete');

    await client.query('COMMIT');
    log('Transaction committed', { resultCount: results.length, nextYearId });

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'PROMOTE_STUDENTS',
      category: 'update',
      log_message: `${results.length} student(s) processed for promotion from academic year ${prevYearId} to ${nextYearId}`,
      target_entity_type: 'student',
      changes: { prevYearId, nextYearId, studentIds, results },
      success: true,
      severity: 'warning'
    });

    return {
      success: true,
      nextYearId,
      results
    };

  } catch (err) {
    log('ERROR, rolling back', err.message);
    await client.query('ROLLBACK');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'PROMOTE_STUDENTS',
      category: 'update',
      log_message: `Failed to promote students from academic year ${prevYearId}: ${err.message}`,
      target_entity_type: 'student',
      changes: { prevYearId, studentIds },
      success: false,
      severity: 'critical'
    });

    throw err;
  } finally {
    client.release();
    log('Client released');
  }
}

module.exports = { promoteStudents };