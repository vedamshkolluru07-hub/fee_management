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
 * 1. UPDATE ACADEMIC YEAR (single or bulk)
 * =========================================================
 * INPUT:
 *  - id: number | number[]
 *  - data: object | object[]
 */
async function updateAcademicYear(id, data, actor = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = Array.isArray(id) ? id : [id];
    const items = Array.isArray(data) ? data : [data];
    if (ids.length !== items.length) {
      throw new Error('Academic year bulk mismatch');
    }
    const results = [];
    for (let i = 0; i < ids.length; i++) {
      const updated = await academicYearsRepo.update(
        ids[i],
        items[i],
        client
      );
      if (!updated) {
        throw new Error(`Academic year ${ids[i]} not found`);
      }
      results.push(updated);
    }
    await client.query('COMMIT');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'UPDATE_ACADEMIC_YEAR',
      category: 'update',
      log_message: `Updated academic year(s): ${ids.join(', ')}`,
      target_entity_type: 'academic',
      changes: { ids, data: items, results },
      success: true
    });

    return {
      success: true,
      data: results.length === 1 ? results[0] : results,
    };
  } catch (err) {
    await client.query('ROLLBACK');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'UPDATE_ACADEMIC_YEAR',
      category: 'update',
      log_message: `Failed to update academic year(s): ${err.message}`,
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
 * 2. UPDATE CLASSES (single or bulk)
 * =========================================================
 * also supports academicYearId validation context
 */
async function updateClasses(id, data, actor = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = Array.isArray(id) ? id : [id];
    const items = Array.isArray(data) ? data : [data];
    if (ids.length !== items.length) {
      throw new Error('Class bulk mismatch');
    }
    const results = [];
    for (let i = 0; i < ids.length; i++) {
      const updated = await classesRepo.update(
        ids[i],
        items[i],
        client
      );
      if (!updated) {
        throw new Error(`Class ${ids[i]} not found`);
      }
      results.push(updated);
    }
    await client.query('COMMIT');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'UPDATE_CLASSES',
      category: 'update',
      log_message: `Updated class(es): ${ids.join(', ')}`,
      target_entity_type: 'academic',
      changes: { ids, data: items, results },
      success: true
    });

    return {
      success: true,
      data: results.length === 1 ? results[0] : results,
    };
  } catch (err) {
    await client.query('ROLLBACK');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'UPDATE_CLASSES',
      category: 'update',
      log_message: `Failed to update class(es): ${err.message}`,
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
 * 3. UPDATE BOOKS (single or bulk)
 * =========================================================
 * supports:
 * - bookId + classId mapping
 * - updates book data
 */
async function updateBooks(id, data, actor = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = Array.isArray(id) ? id : [id];
    const items = Array.isArray(data) ? data : [data];
    if (ids.length !== items.length) {
      throw new Error('Books bulk mismatch');
    }
    const results = [];
    for (let i = 0; i < ids.length; i++) {
      const updated = await booksRepo.update(
        ids[i],
        items[i],
        client
      );
      if (!updated) {
        throw new Error(`Book ${ids[i]} not found`);
      }
      results.push(updated);
    }
    await client.query('COMMIT');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'UPDATE_BOOKS',
      category: 'update',
      log_message: `Updated book(s): ${ids.join(', ')}`,
      target_entity_type: 'academic',
      changes: { ids, data: items, results },
      success: true
    });

    return {
      success: true,
      data: results.length === 1 ? results[0] : results,
    };
  } catch (err) {
    await client.query('ROLLBACK');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'UPDATE_BOOKS',
      category: 'update',
      log_message: `Failed to update book(s): ${err.message}`,
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
 * 4. UPDATE UNIFORMS (single or bulk)
 * =========================================================
 */
async function updateUniforms(id, data, actor = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = Array.isArray(id) ? id : [id];
    const items = Array.isArray(data) ? data : [data];
    if (ids.length !== items.length) {
      throw new Error('Uniform bulk mismatch');
    }
    const results = [];
    for (let i = 0; i < ids.length; i++) {
      const updated = await uniformsRepo.update(
        ids[i],
        items[i],
        client
      );
      if (!updated) {
        throw new Error(`Uniform ${ids[i]} not found`);
      }
      results.push(updated);
    }
    await client.query('COMMIT');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'UPDATE_UNIFORMS',
      category: 'update',
      log_message: `Updated uniform(s): ${ids.join(', ')}`,
      target_entity_type: 'academic',
      changes: { ids, data: items, results },
      success: true
    });

    return {
      success: true,
      data: results.length === 1 ? results[0] : results,
    };
  } catch (err) {
    await client.query('ROLLBACK');

    await createAuditLogService({
      actor_user_id: actor?.user_id || null,
      action: 'UPDATE_UNIFORMS',
      category: 'update',
      log_message: `Failed to update uniform(s): ${err.message}`,
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

module.exports = {
  updateAcademicYear,
  updateClasses,
  updateBooks,
  updateUniforms,
};