const express = require('express');
const router = express.Router();

const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');
const {
  handleCascadeDelete
} = require('../controllers/cascadeDelete.controller.js');

router.post('/', requireSession, attachUser, handleCascadeDelete);

module.exports = router;