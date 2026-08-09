const academicUpdateService = require('../services/updateService.js');

/**
 * =========================================================
 * 1. UPDATE ACADEMIC YEAR
 * =========================================================
 */
async function updateAcademicYear(req, res) {
  try {
    const { id, data } = req.body;

    const result =
      await academicUpdateService.updateAcademicYear(
        id,
        data,
        req.user
      );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

/**
 * =========================================================
 * 2. UPDATE CLASSES
 * =========================================================
 */
async function updateClasses(req, res) {
  try {
    const { id, data } = req.body;

    const result =
      await academicUpdateService.updateClasses(id, data, req.user);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

/**
 * =========================================================
 * 3. UPDATE BOOKS
 * =========================================================
 */
async function updateBooks(req, res) {
  try {
    const { id, data } = req.body;

    const result =
      await academicUpdateService.updateBooks(id, data, req.user);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

/**
 * =========================================================
 * 4. UPDATE UNIFORMS
 * =========================================================
 */
async function updateUniforms(req, res) {
  try {
    const { id, data } = req.body;

    const result =
      await academicUpdateService.updateUniforms(id, data, req.user);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

module.exports = {
  updateAcademicYear,
  updateClasses,
  updateBooks,
  updateUniforms,
};