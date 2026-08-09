// routes/bulkStudentRoutes.js

const express = require("express");
const router = express.Router();

const { requireSession } = require("../../../middlewares/sessionMiddleware.js");
const attachUser = require("../../../middlewares/attachuser.js");

const {
  bulkStudentController,
  manualBulkStudentController,
} = require("../controllers/bulkEnrollment.controller.js");

// ================= FILE BULK UPLOAD (Excel / CSV) =================
router.post(
  "/upload",
  requireSession,
  attachUser,
  bulkStudentController
);

// ================= MANUAL BULK UPLOAD (JSON) =================
router.post(
  "/manual-upload",
  requireSession,
  attachUser,
  manualBulkStudentController
);

module.exports = router;