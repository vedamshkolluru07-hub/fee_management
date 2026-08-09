// routes/studentEnrollmentRoutes.js

const express = require("express");
const router = express.Router();

const { requireSession } = require("../../../middlewares/sessionMiddleware.js");
const attachUser = require("../../../middlewares/attachuser.js");

const studentEnrollmentController = require("../controllers/studentEnrollmentController.js");

// ================= CREATE STUDENT ENROLLMENT =================
router.post(
  "/create",
  requireSession,
  attachUser,
  studentEnrollmentController.createStudentEnrollment
);

module.exports = router;