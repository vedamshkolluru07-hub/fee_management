const express = require('express');
const router = express.Router();

const {
  getFamilyPendingController
} = require('../controllers/familyPendingController.js');

// GET family pending data by studentId
router.get('/:studentId', getFamilyPendingController);

module.exports = router;