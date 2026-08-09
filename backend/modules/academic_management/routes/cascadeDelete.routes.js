const express = require('express');
const router = express.Router();

const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachUser.js');
const {
  handleCascadeDelete
} = require('../controllers/cascadeDelete.controller.js');

router.post('/', requireSession, attachUser, handleCascadeDelete);

module.exports = router;