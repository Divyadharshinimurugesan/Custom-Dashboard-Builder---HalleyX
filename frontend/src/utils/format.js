export const formatCurrency = (value, decimals = 2) =>
  `$${(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

export const formatDate = (date, opts = {}) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...opts });
};

export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
