const router = require('express').Router();
const reports = require('../controllers/reportController');
const { authenticate, allowRoles } = require('../middleware/auth');

router.use(authenticate, allowRoles('ADMIN'));

router.get('/summary', reports.getSummary);
router.get('/preauthorizations', reports.getPreAuthorizationReport);
router.get('/claims', reports.getClaimReport);

module.exports = router;
