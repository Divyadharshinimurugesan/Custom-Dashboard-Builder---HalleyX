const express = require('express');
const router  = express.Router();
const { getDashboard, saveDashboard } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getDashboard).post(protect, saveDashboard);

module.exports = router;