const Order = require('../models/Order');
const { getDateFilter } = require('../utils/dateFilter');

const getAnalytics = async (req, res, next) => {
  try {
    const { range = 'all' } = req.query;
    const dateFilter = getDateFilter(range);

    const [summary] = await Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalOrders: { $sum: 1 }, avgOrderValue: { $avg: '$totalAmount' } }}
    ]);

    const byStatus = await Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $project: { name: '$_id', count: 1, revenue: 1, _id: 0 } }
    ]);

    const byProduct = await Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$product', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { revenue: -1 } }, { $limit: 10 },
      { $project: { product: '$_id', count: 1, revenue: 1, _id: 0 } }
    ]);

    const pendingOrders = await Order.countDocuments({ ...dateFilter, status: 'Pending' });

    const revenueOverTime = await Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } }},
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', revenue: 1, orders: 1, _id: 0 } }
    ]);

    // Filtered orders for table widget
    const filteredOrders = await Order.find(dateFilter).sort({ createdAt: -1 }).limit(200).lean();

    // Smart insights
    const topProduct = byProduct[0] || null;
    const insights = [];
    if (topProduct) {
      insights.push({ type: 'info', icon: '🔥', message: `Top product: ${topProduct.product}`, detail: `${topProduct.count} orders · $${topProduct.revenue.toFixed(2)}` });
    }
    if ((summary?.avgOrderValue || 0) > 0) {
      insights.push({ type: 'info', icon: '💡', message: `Avg order value: $${(summary.avgOrderValue).toFixed(2)}`, detail: 'Based on selected range' });
    }
    if (pendingOrders > 3) {
      insights.push({ type: 'warning', icon: '⚠️', message: `${pendingOrders} pending orders need attention`, detail: '' });
    }

    res.json({
      success: true,
      data: {
        summary: { totalRevenue: summary?.totalRevenue || 0, totalOrders: summary?.totalOrders || 0, avgOrderValue: summary?.avgOrderValue || 0, pendingOrders, topProduct: topProduct?.product || null },
        byStatus, byProduct, revenueOverTime, filteredOrders, insights
      }
    });
  } catch (err) { next(err); }
};

module.exports = { getAnalytics };
