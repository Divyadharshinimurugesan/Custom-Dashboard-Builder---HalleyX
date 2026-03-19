const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  firstName:     { type: String, required: [true, 'First name is required'], trim: true },
  lastName:      { type: String, required: [true, 'Last name is required'],  trim: true },
  email:         { type: String, required: [true, 'Email is required'], lowercase: true, trim: true },
  phone:         { type: String, required: [true, 'Phone number is required'] }, // always String
  streetAddress: { type: String, required: [true, 'Street address is required'] },
  city:          { type: String, required: [true, 'City is required'] },
  state:         { type: String, required: [true, 'State is required'] },
  postalCode:    { type: String, required: [true, 'Postal code is required'] },
  country:       { type: String, required: [true, 'Country is required'] },
  product:       { type: String, required: [true, 'Product is required'] },
  quantity:      { type: Number, required: [true, 'Quantity is required'], min: [1, 'Quantity must be at least 1'] },
  unitPrice:     { type: Number, required: [true, 'Unit price is required'], min: [0.01, 'Price must be > 0'] },
  totalAmount:   { type: Number },
  status: {
    type: String,
    enum: ['Pending', 'In progress', 'Completed'],
    default: 'Pending'
  },
  createdBy: { type: String, default: 'Admin' }
}, { timestamps: true });

// Auto-calculate totalAmount
orderSchema.pre('save', function(next) {
  this.totalAmount = parseFloat((this.quantity * this.unitPrice).toFixed(2));
  next();
});

orderSchema.pre('findOneAndUpdate', function(next) {
  const u = this.getUpdate();
  const q = u.quantity    ?? u.$set?.quantity;
  const p = u.unitPrice   ?? u.$set?.unitPrice;
  if (q !== undefined && p !== undefined) {
    const total = parseFloat((q * p).toFixed(2));
    if (u.$set) u.$set.totalAmount = total;
    else u.totalAmount = total;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
