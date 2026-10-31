const router = require('express').Router();
const patients = require('../controllers/patientController');
const { authenticate, allowRoles } = require('../middleware/auth');

router.use(authenticate);

router.get('/', patients.getAll);
router.get('/:id', patients.getById);
router.post('/', allowRoles('HOSPITAL', 'ADMIN'), patients.create);
router.post('/:id/account', allowRoles('HOSPITAL', 'ADMIN'), patients.createAccount);
router.put('/:id', allowRoles('HOSPITAL', 'ADMIN'), patients.update);

module.exports = router;
