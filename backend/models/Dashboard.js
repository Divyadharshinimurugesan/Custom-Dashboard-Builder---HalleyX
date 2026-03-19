const mongoose = require('mongoose');

const widgetSchema = new mongoose.Schema({
  id:          { type: String, required: true },
  type:        { type: String, required: true, enum: ['kpi','bar','line','pie','area','scatter','table'] },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  width:       { type: Number, default: 4, min: 1 },
  height:      { type: Number, default: 4, min: 1 },
  // Mixed stores ALL config fields without stripping unknown keys
  config:      { type: mongoose.Schema.Types.Mixed, default: {} },
  layout: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    w: { type: Number, default: 4 },
    h: { type: Number, default: 4 }
  }
}, { _id: false });

const dashboardSchema = new mongoose.Schema({
  userId:   { type: String, default: 'admin' },
  name:     { type: String, default: 'My Dashboard' },
  template: { type: String, enum: ['sales','orders','product','blank'], default: 'blank' },
  widgets:  [widgetSchema]
}, { timestamps: true });

module.exports = mongoose.model('Dashboard', dashboardSchema);