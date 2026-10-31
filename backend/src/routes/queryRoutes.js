const router = require('express').Router();
const queries = require('../controllers/queryController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', queries.getAll);
router.get('/:id', queries.getById);
router.post('/:id/respond', queries.respond);
router.post('/:id/resolve', queries.resolve);

module.exports = router;
