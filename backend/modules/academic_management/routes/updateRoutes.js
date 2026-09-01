const express = require('express');
const router = express.Router();

const { requireSession } = require('../../../middlewares/sessionMiddleware.js');
const attachUser = require('../../../middlewares/attachuser.js');
const academicUpdateController = require('../controllers/updateController.js');

router.put('/academic-year', requireSession, attachUser, academicUpdateController.updateAcademicYear);
router.put('/classes', requireSession, attachUser, academicUpdateController.updateClasses);
router.put('/books', requireSession, attachUser, academicUpdateController.updateBooks);
router.put('/uniforms', requireSession, attachUser, academicUpdateController.updateUniforms);

module.exports = router;