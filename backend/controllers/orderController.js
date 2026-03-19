const Order = require('../models/Order');

// GET /orders
const getOrders = async (req, res, next) => {
  try {
    const { search, status, sort = 'createdAt', order = 'desc', page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { firstName:     { $regex: search, $options: 'i' } },
        { lastName:      { $regex: search, $options: 'i' } },
        { email:         { $regex: search, $options: 'i' } },
        { product:       { $regex: search, $options: 'i' } },
        { phone:         { $regex: search, $options: 'i' } },
      ];
    }

    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };
    const skip    = (parseInt(page) - 1) * parseInt(limit);
    const total   = await Order.countDocuments(filter);
    const orders  = await Order.find(filter).sort(sortObj).skip(skip).limit(parseInt(limit));

    res.json({ success: true, data: orders, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
};

// POST /orders
const createOrder = async (req, res, next) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json({ success: true, data: order });
  } catch (err) { next(err); }
};

// PUT /orders/:id
const updateOrder = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (req.body.quantity || req.body.unitPrice) {
      order.totalAmount = order.quantity * order.unitPrice;
      await order.save();
    }
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
};

// DELETE /orders/:id
const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: 'Order deleted' });
  } catch (err) { next(err); }
};

module.exports = { getOrders, createOrder, updateOrder, deleteOrder };
