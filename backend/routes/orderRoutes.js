const express = require('express');
const router  = express.Router();
const { getOrders, createOrder, updateOrder, deleteOrder } = require('../controllers/orderController');

router.route('/').get(getOrders).post(createOrder);
router.route('/:id').put(updateOrder).delete(deleteOrder);

module.exports = router;
