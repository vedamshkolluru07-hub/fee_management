const pool = require('../../../config/db.js');
const academicYearsRepo = require('../repositories/academicYears.repository.js');
const classesRepo = require('../repositories/classes.repository.js');
const booksRepo = require('../repositories/books.repository.js');
const uniformsRepo = require('../repositories/uniform.repository.js');
const {
  createAuditLogService
} = require('../../user_management/services/auditLogServiceCreate.js');

/**
 * =========================================================
 * 1. CREATE CLASSES FOR ACADEMIC YEAR
 * =========================================================
 * - check academic year exists
 * - create classes
 * - make academic_year.is_connected = true
 *   ONLY if currently false
 */
async function createClassesForAcademicYear(
  academicYearId,
  classes = [],
  actor = null
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    /**
     * CHECK ACADEMIC YEAR EXISTS
     */
    const academicYear =
      await academicYearsRepo.findById(
        academicYearId,
        client
      );
    if (!academicYear) {
      throw new Error('Academic year not found');
    }
    /**
     * CREATE CLASSES
     */
    const classPayload = classes.map(c => ({
      academicYearId,
      className: c.className,
      feeAmount: c.feeAmount ?? 0,
      isConnected: false,
    }));
    const createdClasses =
      await classesRepo.create(classPayload, client);
    /**
     * UPDATE ACADEMIC YEAR CONNECTION
     * ONLY IF FALSE
     */
    if (!academicYear.isConnected) {
      await academicYearsRepo.updateIsConnected(
        academicYearId,
        true,
        client
      );
    }
    await client.query('COMMIT');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CREATE_CLASSES',
      category: 'create',
      log_message: `${createdClasses.length} class(es) created for academic year ${academicYearId}`,
      target_entity_type: 'academic',
      changes: { academicYearId, createdClasses },
      success: true
    });

    return {
      success: true,
      data: createdClasses,
    };
  } catch (err) {
    await client.query('ROLLBACK');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CREATE_CLASSES',
      category: 'create',
      log_message: `Failed to create classes for academic year ${academicYearId}: ${err.message}`,
      target_entity_type: 'academic',
      success: false,
      severity: 'warning'
    });

    return {
      success: false,
      message: err.message,
    };
  } finally {
    client.release();
  }
}

/**
 * =========================================================
 * 2. CREATE BOOKS FOR CLASS
 * =========================================================
 * - check class exists
 * - create books
 * - make class.is_connected = true
 *   ONLY if currently false
 */
async function createBooksForClass(
  classId,
  books = [],
  actor = null
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    /**
     * CHECK CLASS EXISTS
     */
    const classData =
      await classesRepo.findById(classId, client);
    if (!classData) {
      throw new Error('Class not found');
    }
    /**
     * CREATE BOOKS
     */
    const bookPayload = books.map(b => ({
      classId,
      bookType: b.bookType,
      bookAmount: b.bookAmount ?? 0,
      isConnected: true,
    }));
    const createdBooks =
      await booksRepo.create(bookPayload, client);
    /**
     * UPDATE CLASS CONNECTION
     * ONLY IF FALSE
     */
    if (!classData.isConnected) {
      await classesRepo.updateIsConnected(
        classId,
        true,
        client
      );
    }
    await client.query('COMMIT');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CREATE_BOOKS',
      category: 'create',
      log_message: `${createdBooks.length} book(s) created for class ${classId}`,
      target_entity_type: 'academic',
      changes: { classId, createdBooks },
      success: true
    });

    return {
      success: true,
      data: createdBooks,
    };
  } catch (err) {
    await client.query('ROLLBACK');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CREATE_BOOKS',
      category: 'create',
      log_message: `Failed to create books for class ${classId}: ${err.message}`,
      target_entity_type: 'academic',
      success: false,
      severity: 'warning'
    });

    return {
      success: false,
      message: err.message,
    };
  } finally {
    client.release();
  }
}

/**
 * =========================================================
 * 3. CREATE CLASSES + RESPECTIVE BOOKS
 * =========================================================
 * - check academic year exists
 * - create classes
 * - create books respectively
 * - after successful books creation
 *   update class.is_connected = true
 * - update academic_year.is_connected = true
 */
async function createClassesAndBooks(
  academicYearId,
  classes = [],
  actor = null
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    /**
     * CHECK ACADEMIC YEAR
     */
    const academicYear =
      await academicYearsRepo.findById(
        academicYearId,
        client
      );
    if (!academicYear) {
      throw new Error('Academic year not found');
    }
    /**
     * CREATE CLASSES
     */
    const classPayload = classes.map(c => ({
      academicYearId,
      className: c.className,
      feeAmount: c.feeAmount ?? 0,
      isConnected: false,
    }));
    const createdClasses =
      await classesRepo.create(classPayload, client);
    /**
     * CREATE BOOKS RESPECTIVELY
     */
    const allBooks = [];
    for (let i = 0; i < classes.length; i++) {
      const inputClass = classes[i];
      const createdClass = createdClasses[i];
      const books = inputClass.books || [];
      if (!books.length) continue;
      const payload = books.map(b => ({
        classId: createdClass.classId,
        bookType: b.bookType,
        bookAmount: b.bookAmount ?? 0,
        isConnected: true,
      }));
      const createdBooks =
        await booksRepo.create(payload, client);
      allBooks.push(...createdBooks);
      /**
       * UPDATE CLASS CONNECTION
       */
      if (!createdClass.isConnected) {
        await classesRepo.updateIsConnected(
          createdClass.classId,
          true,
          client
        );
      }
    }
    /**
     * UPDATE ACADEMIC YEAR CONNECTION
     */
    if (!academicYear.isConnected) {
      await academicYearsRepo.updateIsConnected(
        academicYearId,
        true,
        client
      );
    }
    await client.query('COMMIT');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CREATE_CLASSES_AND_BOOKS',
      category: 'create',
      log_message: `${createdClasses.length} class(es) and ${allBooks.length} book(s) created for academic year ${academicYearId}`,
      target_entity_type: 'academic',
      changes: { academicYearId, classes: createdClasses, books: allBooks },
      success: true
    });

    return {
      success: true,
      data: {
        classes: createdClasses,
        books: allBooks,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CREATE_CLASSES_AND_BOOKS',
      category: 'create',
      log_message: `Failed to create classes and books for academic year ${academicYearId}: ${err.message}`,
      target_entity_type: 'academic',
      success: false,
      severity: 'warning'
    });

    return {
      success: false,
      message: err.message,
    };
  } finally {
    client.release();
  }
}

/**
 * =========================================================
 * 4. CREATE UNIFORMS
 * =========================================================
 * - check academic year exists
 * - create uniforms
 * - keep academic year is_connected true
 *   if already true
 */
async function createUniformsForAcademicYear(
  academicYearId,
  uniforms = [],
  actor = null
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    /**
     * CHECK ACADEMIC YEAR
     */
    const academicYear =
      await academicYearsRepo.findById(
        academicYearId,
        client
      );
    if (!academicYear) {
      throw new Error('Academic year not found');
    }
    /**
     * CREATE UNIFORMS
     */
    const uniformPayload = uniforms.map(u => ({
      academicYearId,
      gender: u.gender,
      uniformType: u.uniformType,
      sizes: u.size ?? null,
      uniformAmount: u.uniformAmount ?? 0,
      isConnected: true,
    }));
    const createdUniforms =
      await uniformsRepo.create(
        uniformPayload,
        client
      );
    /**
     * UPDATE ACADEMIC YEAR CONNECTION
     */
    if (!academicYear.isConnected) {
      await academicYearsRepo.updateIsConnected(
        academicYearId,
        true,
        client
      );
    }
    await client.query('COMMIT');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CREATE_UNIFORMS',
      category: 'create',
      log_message: `${createdUniforms.length} uniform(s) created for academic year ${academicYearId}`,
      target_entity_type: 'academic',
      changes: { academicYearId, createdUniforms },
      success: true
    });

    return {
      success: true,
      data: createdUniforms,
    };
  } catch (err) {
    await client.query('ROLLBACK');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CREATE_UNIFORMS',
      category: 'create',
      log_message: `Failed to create uniforms for academic year ${academicYearId}: ${err.message}`,
      target_entity_type: 'academic',
      success: false,
      severity: 'warning'
    });

    return {
      success: false,
      message: err.message,
    };
  } finally {
    client.release();
  }
}

/**
 * =========================================================
 * CREATE FULL ACADEMIC SETUP
 * =========================================================
 * FLOW:
 * 1. Check academic year already exists
 * 2. Create academic year
 * 3. Create classes
 * 4. Create books for each class
 * 5. Create uniforms
 * 6. Mark academic year connected
 * 7. Mark classes connected
 * 8. COMMIT
 *
 * If anything fails → ROLLBACK
 *
 * =========================================================
 * INPUT:
 * {
 *   academicYear: {
 *     yearLabel,
 *     startDate,
 *     endDate?,
 *     isCurrentYear?
 *   },
 *
 *   classes: [
 *     {
 *       className,
 *       feeAmount?,
 *       books: [
 *         {
 *           bookType,
 *           bookAmount?
 *         }
 *       ]
 *     }
 *   ],
 *
 *   uniforms: [
 *     {
 *       gender,
 *       uniformType,
 *       size?,
 *       uniformAmount?
 *     }
 *   ]
 * }
 */
async function createAcademicSetup(payload = {}, actor = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      academicYear,
      classes = [],
      uniforms = [],
    } = payload;
    /**
     * =====================================================
     * VALIDATIONS
     * =====================================================
     */
    if (!academicYear?.yearLabel) {
      throw new Error('yearLabel is required');
    }
    if (!academicYear?.startDate) {
      throw new Error('startDate is required');
    }
    /**
     * =====================================================
     * CHECK ACADEMIC YEAR EXISTS
     * =====================================================
     */
    const existingYears = await academicYearsRepo.findAll(client);
    const alreadyExists = existingYears.find(
      y =>
        y.yearLabel.trim().toLowerCase() ===
        academicYear.yearLabel.trim().toLowerCase()
    );
    if (alreadyExists) {
      throw new Error('Academic year already exists');
    }
    /**
     * =====================================================
     * CREATE ACADEMIC YEAR
     * =====================================================
     */
    const createdAcademicYear = await academicYearsRepo.create(
      {
        yearLabel: academicYear.yearLabel,
        startDate: academicYear.startDate,
        endDate: academicYear.endDate ?? null,
        isConnected: false,
        isCurrentYear: academicYear.isCurrentYear ?? false,
      },
      client
    );
    /**
     * =====================================================
     * CREATE CLASSES
     * =====================================================
     */
    const classPayload = classes.map(c => ({
      academicYearId: createdAcademicYear.academicYearId,
      className: c.className,
      feeAmount: c.feeAmount ?? 0,
      isConnected: false,
    }));
    const createdClasses = classPayload.length
      ? await classesRepo.create(classPayload, client)
      : [];
    /**
     * =====================================================
     * CREATE BOOKS
     * =====================================================
     */
    const booksPayload = [];
    for (let i = 0; i < classes.length; i++) {
      const inputClass = classes[i];
      const createdClass = createdClasses[i];
      const books = inputClass.books || [];
      for (const b of books) {
        booksPayload.push({
          classId: createdClass.classId,
          bookType: b.bookType,
          bookAmount: b.bookAmount ?? 0,
          isConnected: true,
        });
      }
    }
    const createdBooks = booksPayload.length
      ? await booksRepo.create(booksPayload, client)
      : [];
    /**
     * =====================================================
     * MARK CLASSES CONNECTED
     * =====================================================
     */
    if (createdClasses.length) {
      await classesRepo.updateIsConnected(
        createdClasses.map(c => c.classId),
        true,
        client
      );
    }
    /**
     * =====================================================
     * CREATE UNIFORMS
     * =====================================================
     */
    const uniformPayload = uniforms.map(u => ({
      academicYearId: createdAcademicYear.academicYearId,
      gender: u.gender,
      uniformType: u.uniformType,
      size: u.size ?? null,
      uniformAmount: u.uniformAmount ?? 0,
      isConnected: true,
    }));
    const createdUniforms = uniformPayload.length
      ? await uniformsRepo.create(uniformPayload, client)
      : [];
    /**
     * =====================================================
     * MARK ACADEMIC YEAR CONNECTED
     * =====================================================
     */
    await academicYearsRepo.updateIsConnected(
      createdAcademicYear.academicYearId,
      true,
      client
    );
    /**
     * =====================================================
     * COMMIT
     * =====================================================
     */
    await client.query('COMMIT');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CREATE_ACADEMIC_SETUP',
      category: 'create',
      log_message: `Full academic setup created for year '${academicYear.yearLabel}' (${createdClasses.length} classes, ${createdBooks.length} books, ${createdUniforms.length} uniforms)`,
      target_entity_type: 'academic',
      changes: {
        academicYear: createdAcademicYear,
        classCount: createdClasses.length,
        bookCount: createdBooks.length,
        uniformCount: createdUniforms.length,
      },
      success: true
    });

    return {
      success: true,
      message: 'Academic setup created successfully',
      data: {
        academicYear: {
          ...createdAcademicYear,
          isConnected: true,
        },
        classes: createdClasses.map(c => ({
          ...c,
          isConnected: true,
        })),
        books: createdBooks,
        uniforms: createdUniforms,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'CREATE_ACADEMIC_SETUP',
      category: 'create',
      log_message: `Failed to create academic setup: ${err.message}`,
      target_entity_type: 'academic',
      success: false,
      severity: 'warning'
    });

    return {
      success: false,
      message: err.message || 'Failed to create academic setup',
    };
  } finally {
    client.release();
  }
}

module.exports = {
  createClassesForAcademicYear,
  createBooksForClass,
  createClassesAndBooks,
  createUniformsForAcademicYear,
  createAcademicSetup,
};