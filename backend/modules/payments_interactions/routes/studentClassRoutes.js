const express = require("express");
const router = express.Router();
const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachUser.js');
const studentClassesController = require("../controllers/studentClassController.js");

router.post(
  "/payment-id",requireSession, attachUser,
  studentClassesController.getPaymentId
);

module.exports = router;