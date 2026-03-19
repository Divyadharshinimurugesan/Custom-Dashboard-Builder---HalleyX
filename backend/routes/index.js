const express         = require('express');
const router          = express.Router();
const orderRoutes     = require('./orderRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const authRoutes      = require('./authRoutes');

router.use('/auth',      authRoutes);
router.use('/orders',    orderRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
