/**
 * Returns a MongoDB date filter object based on a named range.
 * @param {string} range - 'today' | 'last7' | 'last30' | 'last90' | 'all'
 * @returns {object} Mongoose query filter or empty object for 'all'
 */
const getDateFilter = (range) => {
  const now = new Date();
  let startDate;

  switch (range) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'last7':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'last30':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      break;
    case 'last90':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 90);
      break;
    case 'all':
    default:
      return {};
  }

  return { createdAt: { $gte: startDate } };
};

module.exports = { getDateFilter };
