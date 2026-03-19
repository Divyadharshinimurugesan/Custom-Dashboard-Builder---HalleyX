// ─────────────────────────────────────────────────────────────────
// Shared helpers — used by DashboardPage, OrdersPage, exports
// ─────────────────────────────────────────────────────────────────

// Product catalogue with fixed prices (unit price is auto-filled, read-only)
export const PRODUCT_PRICES = {
  'Fiber Internet 300 Mbps':    599.00,
  '5G Unlimited Mobile Plan':   299.00,
  'Fiber Internet 1 Gbps':      899.00,
  'Business Internet 500 Mbps': 749.00,
  'VoIP Corporate Package':     399.00,
};

export const PRODUCTS   = Object.keys(PRODUCT_PRICES);
export const COUNTRIES  = ['United States', 'Canada', 'Australia', 'Singapore', 'Hong Kong'];
export const STATUSES   = ['Pending', 'In progress', 'Completed'];
export const CREATED_BY = ['Mr. Michael Harris', 'Mr. Ryan Cooper', 'Ms. Olivia Carter', 'Mr. Lucas Martin'];

// ── Date helpers ───────────────────────────────────────────────
/** Timezone-safe same-day check: compares ISO date strings (YYYY-MM-DD) */
export const isSameDay = (d1, d2) =>
  new Date(d1).toISOString().split('T')[0] ===
  new Date(d2).toISOString().split('T')[0];

/** Get start-of-day in local time as a Date object */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Client-side filter — same logic that the backend applies.
 * Used for memoized KPI/chart/table/export consistency.
 * @param {Array} orders
 * @param {'all'|'today'|'last7'|'last30'} range
 */
export const getFilteredOrders = (orders, range) => {
  if (!orders?.length) return [];
  if (range === 'all') return orders;

  const now = new Date();
  const today = startOfToday();

  return orders.filter(o => {
    if (!o.createdAt) return false;
    const created = new Date(o.createdAt);

    if (range === 'today') {
      return isSameDay(created, now);
    }
    if (range === 'last7') {
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
      return created >= cutoff;
    }
    if (range === 'last30') {
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 30);
      cutoff.setHours(0, 0, 0, 0);
      return created >= cutoff;
    }
    return true;
  });
};

// ── KPI computation from filtered orders ─────────────────────
export const computeKPIs = (filteredOrders) => {
  const totalRevenue  = filteredOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalOrders   = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const pendingOrders = filteredOrders.filter(o => o.status === 'Pending').length;

  // Top product by revenue
  const productMap = {};
  filteredOrders.forEach(o => {
    if (!o.product) return;
    if (!productMap[o.product]) productMap[o.product] = { count: 0, revenue: 0 };
    productMap[o.product].count++;
    productMap[o.product].revenue += o.totalAmount || 0;
  });
  const topEntry = Object.entries(productMap).sort((a, b) => b[1].revenue - a[1].revenue)[0];
  const topProduct = topEntry ? { name: topEntry[0], ...topEntry[1] } : null;

  return { totalRevenue, totalOrders, avgOrderValue, pendingOrders, topProduct };
};

// ── Chart data from filtered orders ──────────────────────────
export const computeChartData = (filteredOrders) => {
  // By status
  const statusMap = {};
  filteredOrders.forEach(o => {
    if (!o.status) return;
    statusMap[o.status] = (statusMap[o.status] || 0) + 1;
  });
  const byStatus = Object.entries(statusMap).map(([name, count]) => ({ name, count }));

  // By product (revenue sorted)
  const productMap = {};
  filteredOrders.forEach(o => {
    if (!o.product) return;
    if (!productMap[o.product]) productMap[o.product] = { count: 0, revenue: 0 };
    productMap[o.product].count++;
    productMap[o.product].revenue += o.totalAmount || 0;
  });
  const byProduct = Object.entries(productMap)
    .map(([product, d]) => ({ product, count: d.count, revenue: Math.round(d.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Revenue over time (by day)
  const dayMap = {};
  filteredOrders.forEach(o => {
    if (!o.createdAt) return;
    const day = new Date(o.createdAt).toISOString().split('T')[0];
    if (!dayMap[day]) dayMap[day] = { revenue: 0, orders: 0 };
    dayMap[day].revenue += o.totalAmount || 0;
    dayMap[day].orders++;
  });
  const revenueOverTime = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, revenue: Math.round(d.revenue), orders: d.orders }));

  return { byStatus, byProduct, revenueOverTime };
};

// ── Validation helpers ─────────────────────────────────────────
export const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());

/** Phone: 10–15 digits only (strips non-digits before checking) */
/** Phone: exactly 10 digits (strips spaces/hyphens before checking) */
export const validatePhone = (v) => /^[0-9]{10}$/.test((v || '').replace(/\D/g, ''));

// ── Order ID formatting ────────────────────────────────────────
/** Returns "#ORD-<last8>" — Excel-safe string ID */
export const formatOrderId = (id) => id ? `#ORD-${id.slice(-8).toLowerCase()}` : '—';

// ── Status colour map ──────────────────────────────────────────
export const STATUS_COLORS = {
  Pending:       '#f59e0b',
  'In progress': '#3b82f6',
  Completed:     '#10b981',
};

export const PIE_PALETTE = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
