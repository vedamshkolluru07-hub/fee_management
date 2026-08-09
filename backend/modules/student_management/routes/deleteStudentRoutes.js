const express = require("express");

const router = express.Router();

const { requireSession } = require("../../../middlewares/sessionMiddleware.js");
const attachUser = require("../../../middlewares/attachuser.js");

const StudentController = require("../controllers/deleteStudentController.js");

// DELETE STUDENT
router.delete(
  "/delete/:student_id",
  requireSession,
  attachUser,
  StudentController.deleteStudent
);

module.exports = router;