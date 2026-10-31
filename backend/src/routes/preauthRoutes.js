const router = require('express').Router();
const preauth = require('../controllers/preauthController');
const { authenticate, allowRoles } = require('../middleware/auth');

router.use(authenticate);

router.get('/', preauth.getAll);
router.get('/:id', preauth.getById);
router.get('/:id/readiness', preauth.readiness);
router.post('/', allowRoles('HOSPITAL', 'ADMIN'), preauth.create);
router.put('/:id', allowRoles('HOSPITAL', 'ADMIN'), preauth.update);
router.post('/:id/submit', allowRoles('HOSPITAL', 'ADMIN'), preauth.submit);
router.post('/:id/approve', allowRoles('INSURER', 'ADMIN'), preauth.approve);
router.post('/:id/partial-approve', allowRoles('INSURER', 'ADMIN'), preauth.partialApprove);
router.post('/:id/reject', allowRoles('INSURER', 'ADMIN'), preauth.reject);
router.post('/:id/query', allowRoles('INSURER', 'ADMIN'), preauth.raiseQuery);

module.exports = router;
