const pool = require('../../../config/db.js');
const academicYearsRepo = require('../repositories/academicYears.repository.js');
const booksRepo = require('../repositories/books.repository.js');
const classesRepo = require('../repositories/classes.repository.js');
const uniformsRepo = require('../repositories/uniform.repository.js');
const {
  createAuditLogService
} = require('../../user_management/services/auditLogServiceCreate.js');

async function cascadeDelete({
  academicYearIds = [],
  classIds = [],
  bookIds = [],
  uniformIds = [],
  forceDelete = false,
  actor = null
}) {
  const client = await pool.connect();
  const debug = [];
  const log = (message, data = null) => {
    debug.push({
      message,
      data,
      time: new Date().toISOString()
    });
  };
  try {
    await client.query('BEGIN');
    log('Transaction started');
    // ================= NORMALIZE INPUT =================
    academicYearIds = [...new Set(academicYearIds)];
    classIds = [...new Set(classIds)];
    bookIds = [...new Set(bookIds)];
    uniformIds = [...new Set(uniformIds)];
    const deletable = {
      books: new Set(),
      uniforms: new Set(),
      classes: new Set(),
      academicYears: new Set()
    };
    const blocked = {
      books: new Set(),
      uniforms: new Set(),
      classes: new Set(),
      academicYears: new Set()
    };
    // ================= EXPAND RELATIONS =================
    if (academicYearIds.length) {
      const classes = await classesRepo.findByAcademicYearId(academicYearIds, client);
      for (const c of classes) classIds.push(c.classId);
    }
    classIds = [...new Set(classIds)];
    if (classIds.length) {
      const books = await booksRepo.findByClassId(classIds, client);
      for (const b of books) bookIds.push(b.bookId);
    }
    if (academicYearIds.length) {
      const uniforms = await uniformsRepo.findByAcademicYearId(academicYearIds, client);
      for (const u of uniforms) uniformIds.push(u.uniformId);
    }
    bookIds = [...new Set(bookIds)];
    uniformIds = [...new Set(uniformIds)];
    log('Dependency expansion complete');
    // ================= FETCH ALL DATA =================
    const [books, uniforms, classes, academicYears] = await Promise.all([
      bookIds.length ? booksRepo.findById(bookIds, client) : [],
      uniformIds.length ? uniformsRepo.findById(uniformIds, client) : [],
      classIds.length ? classesRepo.findById(classIds, client) : [],
      academicYearIds.length ? academicYearsRepo.findById(academicYearIds, client) : []
    ]);
    // ================= BOOK RULES =================
    for (const book of books) {
      if (forceDelete || !book.isConnected) {
        deletable.books.add(book.bookId);
      } else {
        blocked.books.add(book.bookId);
        blocked.classes.add(book.classId);
      }
    }
    // ================= UNIFORM RULES =================
    for (const uniform of uniforms) {
      if (forceDelete || !uniform.isConnected) {
        deletable.uniforms.add(uniform.uniformId);
      } else {
        blocked.uniforms.add(uniform.uniformId);
        blocked.academicYears.add(uniform.academicYearId);
      }
    }
    // ================= CLASS RULES =================
    for (const cls of classes) {
      const locked = !forceDelete && (cls.isConnected || cls.isFinanceConnected);
      if (locked) {
        blocked.classes.add(cls.classId);
        blocked.academicYears.add(cls.academicYearId);
        continue;
      }
      deletable.classes.add(cls.classId);
      await client.query(
        `UPDATE classes SET is_connected = FALSE WHERE class_id = $1`,
        [cls.classId]
      );
    }
    // ================= ACADEMIC YEAR RULES =================
    for (const year of academicYears) {
      const isBlocked = blocked.academicYears.has(year.academicYearId);
      if (isBlocked && !forceDelete) continue;
      deletable.academicYears.add(year.academicYearId);
      await client.query(
        `UPDATE academic_years SET is_connected = FALSE WHERE academic_year_id = $1`,
        [year.academicYearId]
      );
    }
    // ================= DELETE CHILD TABLES =================
    if (deletable.books.size) {
      await client.query(
        `DELETE FROM books WHERE book_id = ANY($1::int[])`,
        [[...deletable.books]]
      );
    }
    if (deletable.uniforms.size) {
      await client.query(
        `DELETE FROM uniforms WHERE uniform_id = ANY($1::int[])`,
        [[...deletable.uniforms]]
      );
    }
    // ================= DELETE PARENTS =================
    if (deletable.classes.size) {
      await client.query(
        `DELETE FROM classes WHERE class_id = ANY($1::int[])`,
        [[...deletable.classes]]
      );
    }
    if (deletable.academicYears.size) {
      await client.query(
        `DELETE FROM academic_years WHERE academic_year_id = ANY($1::int[])`,
        [[...deletable.academicYears]]
      );
    }
    await client.query('COMMIT');
    log('Transaction committed');

    const deleted = {
      books: [...deletable.books],
      uniforms: [...deletable.uniforms],
      classes: [...deletable.classes],
      academicYears: [...deletable.academicYears]
    };

    const blockedResult = {
      books: [...blocked.books],
      uniforms: [...blocked.uniforms],
      classes: [...blocked.classes],
      academicYears: [...blocked.academicYears]
    };

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CASCADE_DELETE_ACADEMIC_DATA',
      category: 'delete',
      log_message: `Cascade delete: ${deleted.academicYears.length} year(s), ${deleted.classes.length} class(es), ${deleted.books.length} book(s), ${deleted.uniforms.length} uniform(s) deleted${forceDelete ? ' (forced)' : ''}`,
      target_entity_type: 'academic',
      changes: { deleted, blocked: blockedResult, forceDelete },
      success: true,
      severity: 'critical'
    });

    return {
      success: true,
      debug,
      deleted,
      blocked: blockedResult
    };
  } catch (err) {
    await client.query('ROLLBACK');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CASCADE_DELETE_ACADEMIC_DATA',
      category: 'delete',
      log_message: `Cascade delete failed: ${err.message}`,
      target_entity_type: 'academic',
      changes: { academicYearIds, classIds, bookIds, uniformIds, forceDelete },
      success: false,
      severity: 'critical'
    });

    return {
      success: false,
      error: err.message,
      debug
    };
  } finally {
    client.release();
  }
}
module.exports = {
  cascadeDelete
};