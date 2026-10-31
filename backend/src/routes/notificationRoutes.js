const router = require('express').Router();
const notifications = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', notifications.getAll);
router.put('/:id/read', notifications.markAsRead);
router.put('/read-all', notifications.markAllAsRead);

module.exports = router;
