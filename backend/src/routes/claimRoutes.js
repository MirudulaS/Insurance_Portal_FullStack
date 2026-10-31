const router = require('express').Router();
const claims = require('../controllers/claimController');
const { authenticate, allowRoles } = require('../middleware/auth');

router.use(authenticate);

router.get('/', claims.getAll);
router.get('/:id', claims.getById);
router.post('/', allowRoles('HOSPITAL', 'ADMIN'), claims.create);
router.put('/:id', allowRoles('HOSPITAL', 'ADMIN'), claims.update);
router.post('/:id/verify', allowRoles('INSURER', 'ADMIN'), claims.verify);
router.post('/:id/approve', allowRoles('INSURER', 'ADMIN'), claims.approve);
router.post('/:id/reject', allowRoles('INSURER', 'ADMIN'), claims.reject);
router.post('/:id/settle', allowRoles('INSURER', 'ADMIN'), claims.settle);

module.exports = router;
