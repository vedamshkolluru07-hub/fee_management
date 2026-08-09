const setupService = require('../services/createService.js');

/**
 * =========================================================
 * 1. CREATE CLASSES FOR ACADEMIC YEAR
 * =========================================================
 * POST /api/setup/academic-years/:academicYearId/classes
 */
const createClassesForAcademicYear = async (req, res) => {
  console.log('[DEBUG] createClassesForAcademicYear - Request received');
  console.log('[DEBUG] Params:', req.params);
  console.log('[DEBUG] Body:', req.body);

  try {
    const academicYearId = Number(req.params.academicYearId);
    const { classes } = req.body;

    console.log('[DEBUG] Parsed academicYearId:', academicYearId);
    console.log('[DEBUG] Classes payload:', classes);

    const result = await setupService.createClassesForAcademicYear(
      academicYearId,
      classes,
      req.user
    );

    console.log('[DEBUG] Service result (createClassesForAcademicYear):', result);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error('[ERROR] createClassesForAcademicYear failed:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * =========================================================
 * 2. CREATE BOOKS FOR CLASS
 * =========================================================
 * POST /api/setup/classes/:classId/books
 */
const createBooksForClass = async (req, res) => {
  console.log('[DEBUG] createBooksForClass - Request received');
  console.log('[DEBUG] Params:', req.params);
  console.log('[DEBUG] Body:', req.body);

  try {
    const classId = Number(req.params.classId);
    const { books } = req.body;

    console.log('[DEBUG] Parsed classId:', classId);
    console.log('[DEBUG] Books payload:', books);

    const result = await setupService.createBooksForClass(
      classId,
      books,
      req.user
    );

    console.log('[DEBUG] Service result (createBooksForClass):', result);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error('[ERROR] createBooksForClass failed:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * =========================================================
 * 3. CREATE CLASSES + BOOKS
 * =========================================================
 * POST /api/setup/academic-years/:academicYearId/classes-with-books
 */
const createClassesAndBooks = async (req, res) => {
  console.log('[DEBUG] createClassesAndBooks - Request received');
  console.log('[DEBUG] Params:', req.params);
  console.log('[DEBUG] Body:', req.body);

  try {
    const academicYearId = Number(req.params.academicYearId);
    const { classes } = req.body;

    console.log('[DEBUG] Parsed academicYearId:', academicYearId);
    console.log('[DEBUG] Classes payload:', classes);

    const result = await setupService.createClassesAndBooks(
      academicYearId,
      classes,
      req.user
    );

    console.log('[DEBUG] Service result (createClassesAndBooks):', result);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error('[ERROR] createClassesAndBooks failed:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * =========================================================
 * 4. CREATE UNIFORMS FOR ACADEMIC YEAR
 * =========================================================
 * POST /api/setup/academic-years/:academicYearId/uniforms
 */
const createUniformsForAcademicYear = async (req, res) => {
  console.log('[DEBUG] createUniformsForAcademicYear - Request received');
  console.log('[DEBUG] Params:', req.params);
  console.log('[DEBUG] Body:', req.body);

  try {
    const academicYearId = Number(req.params.academicYearId);
    const { uniforms } = req.body;

    console.log('[DEBUG] Parsed academicYearId:', academicYearId);
    console.log('[DEBUG] Uniforms payload:', uniforms);

    const result = await setupService.createUniformsForAcademicYear(
      academicYearId,
      uniforms,
      req.user
    );

    console.log('[DEBUG] Service result (createUniformsForAcademicYear):', result);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error('[ERROR] createUniformsForAcademicYear failed:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * =========================================================
 * 5. CREATE FULL ACADEMIC SETUP
 * =========================================================
 * POST /api/setup/academic-setup
 */
const createAcademicSetup = async (req, res) => {
  console.log('[DEBUG] createAcademicSetup - Request received');
  console.log('[DEBUG] Body:', req.body);

  try {
    const result = await setupService.createAcademicSetup(req.body, req.user);

    console.log('[DEBUG] Service result (createAcademicSetup):', result);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error('[ERROR] createAcademicSetup failed:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * =========================================================
 * EXPORTS
 * =========================================================
 */
module.exports = {
  createClassesForAcademicYear,
  createBooksForClass,
  createClassesAndBooks,
  createUniformsForAcademicYear,
  createAcademicSetup,
};