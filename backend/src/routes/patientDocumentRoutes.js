const router = require('express').Router();
const vault = require('../controllers/patientDocumentController');
const { authenticate, allowRoles } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(authenticate);

router.get('/', vault.getAll);
router.post('/upload', allowRoles('PATIENT', 'HOSPITAL', 'ADMIN'), upload.single('file'), vault.upload);
router.delete('/:id', allowRoles('PATIENT', 'HOSPITAL', 'ADMIN'), vault.remove);

module.exports = router;
