const express = require('express');
const router = express.Router();

const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');
const controller = require('../controllers/create.controller.js');

router.post(
  '/academic-years/:academicYearId/classes',
  requireSession, attachUser,
  controller.createClassesForAcademicYear
);

router.post(
  '/classes/:classId/books',
  requireSession, attachUser,
  controller.createBooksForClass
);

router.post(
  '/academic-years/:academicYearId/classes-with-books',
  requireSession, attachUser,
  controller.createClassesAndBooks
);

router.post(
  '/academic-years/:academicYearId/uniforms',
  requireSession, attachUser,
  controller.createUniformsForAcademicYear
);

router.post(
  '/academic-setup',
  requireSession, attachUser,
  controller.createAcademicSetup
);

module.exports = router;