const express = require('express');
const router = express.Router();

const {
  getStudentsByAcademicYear,
} = require('../controllers/studentController.js');

// GET students by academic year with filters
router.get(
  '/students/:academic_year_id', getStudentsByAcademicYear
);

module.exports = router;