const express = require('express');
const router = express.Router();

const academicReadController = require('../controllers/readController.js');

/**
 * =========================================================
 * ACADEMIC YEAR READ ROUTES
 * =========================================================
 */

// ================= GET ALL ACADEMIC YEARS =================
router.get(
  "/all",
  academicReadController.getAllAcademicYears
);

// GET full academic structure (year + classes + books + uniforms)
router.get(
  '/academic-year/:academicYearId/full',
  academicReadController.getAcademicYearFull
);

// GET academic year by id
router.get(
  '/academic-year/:id',
  academicReadController.getAcademicYearById
);

// GET classes by academic year
router.get(
  '/academic-year/:academicYearId/classes',
  academicReadController.getClassesByAcademicYearId
);

// GET books by academic year (via classes)
router.get(
  '/academic-year/:academicYearId/books',
  academicReadController.getBooksByAcademicYearId
);

// GET uniforms by academic year
router.get(
  '/academic-year/:academicYearId/uniforms',
  academicReadController.getUniformsByAcademicYearId
);

/**
 * =========================================================
 * BOOK ROUTES
 * =========================================================
 */

// GET books by class id
router.get(
  '/class/:classId/books',
  academicReadController.getBooksByClassId
);

/**
 * =========================================================
 * UNIFORM FILTER ROUTES
 * =========================================================
 */

// GET uniforms with filters
// query params:
// academicYearId, gender, uniformType, size
router.get(
  '/uniforms',
  academicReadController.getUniformsByFilters
);

module.exports = router;