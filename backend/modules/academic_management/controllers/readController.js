const academicReadService = require('../services/readService.js');


// ================= GET ALL ACADEMIC YEARS =================
const getAllAcademicYears = async (req, res) => {
  try {
    const result = await academicReadService.getAllAcademicYears();

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });

  } catch (error) {
    console.error("Error in getAllAcademicYears controller:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * =========================================================
 * 1. GET FULL ACADEMIC STRUCTURE
 * =========================================================
 */
async function getAcademicYearFull(req, res) {
  try {
    const { academicYearId } = req.params;

    const result =
      await academicReadService.getAcademicYearFull(
        Number(academicYearId)
      );

    if (!result.success) {
      return res.status(404).json(result);
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
 * 2. GET ACADEMIC YEAR BY ID
 * =========================================================
 */
async function getAcademicYearById(req, res) {
  try {
    const { id } = req.params;

    const result =
      await academicReadService.getAcademicYearById(
        Number(id)
      );

    if (!result.success) {
      return res.status(404).json(result);
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
 * 3. GET CLASSES BY ACADEMIC YEAR
 * =========================================================
 */
async function getClassesByAcademicYearId(req, res) {
  try {
    const { academicYearId } = req.params;

    const result =
      await academicReadService.getClassesByAcademicYearId(
        Number(academicYearId)
      );

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
 * 4. GET BOOKS BY ACADEMIC YEAR
 * =========================================================
 */
async function getBooksByAcademicYearId(req, res) {
  try {
    const { academicYearId } = req.params;

    const result =
      await academicReadService.getBooksByAcademicYearId(
        Number(academicYearId)
      );

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
 * 5. GET UNIFORMS BY ACADEMIC YEAR
 * =========================================================
 */
async function getUniformsByAcademicYearId(req, res) {
  try {
    const { academicYearId } = req.params;

    const result =
      await academicReadService.getUniformsByAcademicYearId(
        Number(academicYearId)
      );

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
 * 6. GET UNIFORMS WITH FILTERS
 * =========================================================
 */
async function getUniformsByFilters(req, res) {
  try {
    const filters = {
      academicYearId: req.query.academicYearId
        ? Number(req.query.academicYearId)
        : undefined,
      gender: req.query.gender,
      uniformType: req.query.uniformType,
      size: req.query.size,
    };

    const result =
      await academicReadService.getUniformsByFilters(
        filters
      );

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
 * 7. GET BOOKS BY CLASS ID
 * =========================================================
 */
async function getBooksByClassId(req, res) {
  try {
    const { classId } = req.params;

    const result =
      await academicReadService.getBooksByClassId(
        Number(classId)
      );

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

module.exports = {
  getAllAcademicYears,
  getAcademicYearFull,
  getAcademicYearById,
  getClassesByAcademicYearId,
  getBooksByAcademicYearId,
  getUniformsByAcademicYearId,
  getUniformsByFilters,
  getBooksByClassId,
};