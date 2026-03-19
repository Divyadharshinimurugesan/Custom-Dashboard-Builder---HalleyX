const Dashboard = require('../models/Dashboard');

const getDashboard = async (req, res, next) => {
  try {
    let dashboard = await Dashboard.findOne().sort({ updatedAt: -1 });
    if (!dashboard) {
      dashboard = await Dashboard.create({ name: 'My Dashboard', template: 'blank', widgets: [] });
    }
    res.json({ success: true, data: dashboard });
  } catch (err) { next(err); }
};

const saveDashboard = async (req, res, next) => {
  try {
    const { name, template, widgets } = req.body;
    let dashboard = await Dashboard.findOne().sort({ updatedAt: -1 });

    if (dashboard) {
      if (name     !== undefined) dashboard.name     = name;
      if (template !== undefined) dashboard.template = template;
      if (widgets  !== undefined) dashboard.widgets  = widgets;
      // Mixed type fields need explicit markModified so Mongoose detects the change
      dashboard.markModified('widgets');
      await dashboard.save();
    } else {
      dashboard = await Dashboard.create({
        name:     name     || 'My Dashboard',
        template: template || 'blank',
        widgets:  widgets  || []
      });
    }

    res.json({ success: true, data: dashboard });
  } catch (err) { next(err); }
};

module.exports = { getDashboard, saveDashboard };