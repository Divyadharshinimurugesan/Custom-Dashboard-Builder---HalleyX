const express = require('express');
const router  = express.Router();
const { getDashboard, saveDashboard } = require('../controllers/dashboardController');

router.route('/').get(getDashboard).post(saveDashboard);

module.exports = router;
