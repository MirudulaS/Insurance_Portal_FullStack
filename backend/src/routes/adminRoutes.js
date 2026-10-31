const router = require('express').Router();
const users = require('../controllers/userController');
const { authenticate, allowRoles } = require('../middleware/auth');

router.use(authenticate, allowRoles('ADMIN'));

router.get('/users', users.getAllUsers);
router.get('/audit-logs', users.getAuditLogs);

module.exports = router;
