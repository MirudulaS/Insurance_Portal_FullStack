const router = require('express').Router();
const organizations = require('../controllers/organizationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/hospitals', organizations.getHospitals);
router.get('/insurers', organizations.getInsurers);

module.exports = router;
