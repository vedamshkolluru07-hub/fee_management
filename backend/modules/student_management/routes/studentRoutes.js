const express = require("express");
const router = express.Router();

const { requireSession } = require("../../../middlewares/sessionMiddleware.js");
const attachUser = require("../../../middlewares/attachuser.js");

const StudentController = require("../controllers/updateStudentController.js");

// =========================================================
// STUDENT ROUTES
// =========================================================
router.put(
    "/student/:student_id",
    requireSession,
    attachUser,
    StudentController.updateStudent
);

router.delete(
    "/student/:student_id",
    requireSession,
    attachUser,
    StudentController.deleteStudent
);

router.get(
    "/student/:student_id/relations",
    StudentController.getRelationsByStudentId
);

// =========================================================
// PARENT ROUTES
// =========================================================
router.put(
    "/parent/:parents_id",
    requireSession,
    attachUser,
    StudentController.updateParent
);

router.get(
    "/parent/:parents_id/relations",
    StudentController.getRelationsByParentId
);

module.exports = router;