const academicYearsRepo = require('../repositories/academicYears.repository.js');
const classesRepo = require('../repositories/classes.repository.js');
const booksRepo = require('../repositories/books.repository.js');
const uniformsRepo = require('../repositories/uniform.repository.js');


// ================= GET ALL ACADEMIC YEARS =================
const getAllAcademicYears = async () => {
  try {
    const academicYears = await academicYearsRepo.findAll();

    return {
      success: true,
      message: "Academic years fetched successfully",
      data: academicYears,
    };
  } catch (error) {
    console.error("Error fetching academic years:", error);

    return {
      success: false,
      message: error.message || "Failed to fetch academic years",
    };
  }
};

/**
 * =========================================================
 * 1. GET FULL ACADEMIC YEAR STRUCTURE
 * (academic year + classes + books + uniforms)
 * =========================================================
 */
async function getAcademicYearFull(academicYearId) {
  const academicYear =
    await academicYearsRepo.findById(academicYearId);

  if (!academicYear) {
    return {
      success: false,
      message: 'Academic year not found',
    };
  }

  const classes =
    await classesRepo.findByAcademicYearId(academicYearId);

  const classIds = classes.map(c => c.classId);

  const books = classIds.length
    ? await booksRepo.findByClassId(classIds)
    : [];

  const uniforms =
    await uniformsRepo.findByAcademicYearId(
      academicYearId
    );

  return {
    success: true,
    data: {
      academicYear,
      classes,
      books,
      uniforms,
    },
  };
}

/**
 * =========================================================
 * 2. GET ACADEMIC YEAR ONLY
 * =========================================================
 */
async function getAcademicYearById(id) {
  const data = await academicYearsRepo.findById(id);

  if (!data) {
    return {
      success: false,
      message: 'Academic year not found',
    };
  }

  return {
    success: true,
    data,
  };
}

/**
 * =========================================================
 * 3. GET CLASSES IN ACADEMIC YEAR
 * =========================================================
 */
async function getClassesByAcademicYearId(academicYearId) {
  const data =
    await classesRepo.findByAcademicYearId(academicYearId);

  return {
    success: true,
    data,
  };
}

/**
 * =========================================================
 * 4. GET BOOKS BY ACADEMIC YEAR (via classes)
 * =========================================================
 */
async function getBooksByAcademicYearId(academicYearId) {
  const classes =
    await classesRepo.findByAcademicYearId(academicYearId);

  const classIds = classes.map(c => c.classId);

  const books = classIds.length
    ? await booksRepo.findByClassId(classIds)
    : [];

  return {
    success: true,
    data: books,
  };
}

/**
 * =========================================================
 * 5. GET UNIFORMS BY ACADEMIC YEAR
 * =========================================================
 */
async function getUniformsByAcademicYearId(academicYearId) {
  const data =
    await uniformsRepo.findByAcademicYearId(
      academicYearId
    );

  return {
    success: true,
    data,
  };
}

/**
 * =========================================================
 * 6. GET UNIFORMS WITH FILTERS
 * =========================================================
 * filters:
 * {
 *   academicYearId?,
 *   gender?,
 *   uniformType?,
 *   size?
 * }
 */
async function getUniformsByFilters(filters = {}) {
  const data =
    await uniformsRepo.findByFilters(filters);

  return {
    success: true,
    data,
  };
}

/**
 * =========================================================
 * 7. GET BOOKS BY CLASS ID
 * =========================================================
 * INPUT:
 *  - classId: number | number[]
 *
 * OUTPUT:
 *  - array of books
 */
async function getBooksByClassId(classId) {
  const ids = Array.isArray(classId) ? classId : [classId];

  if (!ids.length) {
    return {
      success: true,
      data: [],
    };
  }

  const data = await booksRepo.findByClassId(ids);

  return {
    success: true,
    data,
  };
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