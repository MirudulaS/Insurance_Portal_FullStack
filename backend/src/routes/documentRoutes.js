const router = require('express').Router();
const documents = require('../controllers/documentController');
const { authenticate, allowRoles } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(authenticate);

router.get('/', documents.getAll);
router.get('/:id', documents.getById);
router.post('/upload', allowRoles('HOSPITAL', 'ADMIN'), upload.single('file'), documents.upload);
router.delete('/:id', allowRoles('HOSPITAL', 'ADMIN'), documents.remove);

module.exports = router;
