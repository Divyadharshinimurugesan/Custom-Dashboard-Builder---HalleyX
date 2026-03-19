import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders, getDashboard } from '../services/api';
import { exportOrdersCSV, exportDashboardPDF } from '../utils/export';
import {
  getFilteredOrders, computeKPIs, computeChartData,
  STATUS_COLORS, PIE_PALETTE, formatOrderId,
} from '../utils/helpers';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const DATE_RANGES = [
  { value: 'all',    label: 'All Time'     },
  { value: 'today',  label: 'Today'        },
  { value: 'last7',  label: 'Last 7 Days'  },
  { value: 'last30', label: 'Last 30 Days' },
];

const TEMPLATES = [
  { id: 'sales',   label: 'Sales Overview',      desc: 'Revenue KPIs, product bar, status pie' },
  { id: 'orders',  label: 'Orders Analytics',    desc: 'Order counts, status, table' },
  { id: 'product', label: 'Product Performance', desc: 'Top products, revenue trend' },
  { id: 'blank',   label: 'Blank',               desc: 'Empty canvas' },
];

// Column accessors for table widget
const COL_LABELS = {
  'Customer ID':    o => formatOrderId(o._id),
  'Order ID':       o => formatOrderId(o._id),
  'Customer name':  o => `${o.firstName || ''} ${o.lastName || ''}`.trim() || '—',
  'Email id':       o => o.email || '—',
  'Phone number':   o => String(o.phone || '—'),
  'Address':        o => o.city ? `${o.city}, ${o.country}` : (o.address ? `${o.address.city}, ${o.address.country}` : '—'),
  'Order date':     o => o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
  'Product':        o => o.product || '—',
  'Quantity':       o => String(o.quantity ?? '—'),
  'Unit price':     o => o.unitPrice  != null ? `$${Number(o.unitPrice).toFixed(2)}`  : '—',
  'Total amount':   o => o.totalAmount != null ? `$${Number(o.totalAmount).toFixed(2)}` : '—',
  'Status':         o => o.status || '—',
  'Created by':     o => o.createdBy || '—',
};

// ── Empty state block ──────────────────────────────────────────
function EmptyState({ title = 'No orders found', subtitle = 'No data for the selected period.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="1.5">
          <path d="M9 17H7A5 5 0 017 7h10a5 5 0 010 10h-2M12 12v5m0 0l-2-2m2 2l2-2"/>
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────
function KPICard({ label, value, sub, accent, pctChange }) {
  // pctChange: number or null. Shown as "+8.0%" or "-5.0%"
  const hasPct  = pctChange !== null && pctChange !== undefined;
  const pctUp   = hasPct && pctChange >= 0;
  const pctText = hasPct ? `${pctUp ? '+' : ''}${pctChange.toFixed(1)}%` : null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-gray-500">{label}</p>
        <div className={`w-2 h-2 rounded-full ${accent}`}/>
      </div>
      <div>
        <p className="text-[26px] font-semibold text-gray-900 font-mono leading-none tracking-tight">{value}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
          {pctText && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${pctUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
              {pctText} vs prev period
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Responsive column helper ──────────────────────────────────
// Desktop ≥1024px → 12 cols | Tablet 640–1023px → 8 cols | Mobile <640px → 4 cols
const getGridCols = (width) => {
  if (width >= 1024) return 12;
  if (width >= 640)  return 8;
  return 4;
};


// ── Smart Insights Panel ───────────────────────────────────────────────────
function SmartInsights({ filteredOrders, range }) {
  const insights = useMemo(() => {
    if (!filteredOrders.length) return [];

    const result = [];

    // 1. Top selling product by revenue
    const productRev = {};
    filteredOrders.forEach(o => {
      if (!o.product) return;
      productRev[o.product] = (productRev[o.product] || 0) + (o.totalAmount || 0);
    });
    const topProductEntry = Object.entries(productRev).sort((a, b) => b[1] - a[1])[0];
    if (topProductEntry) {
      result.push({
        icon: '🔥',
        color: 'border-orange-100 bg-orange-50 text-orange-800',
        dot:   'bg-orange-400',
        text:  `Top product is <strong>${topProductEntry[0]}</strong> with $${Math.round(topProductEntry[1]).toLocaleString()} in revenue`,
      });
    }

    // 2. Highest revenue day
    const dayRev = {};
    filteredOrders.forEach(o => {
      if (!o.createdAt) return;
      const day = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      dayRev[day] = (dayRev[day] || 0) + (o.totalAmount || 0);
    });
    const topDayEntry = Object.entries(dayRev).sort((a, b) => b[1] - a[1])[0];
    if (topDayEntry) {
      result.push({
        icon: '📅',
        color: 'border-blue-100 bg-blue-50 text-blue-800',
        dot:   'bg-blue-400',
        text:  `Best revenue day was <strong>${topDayEntry[0]}</strong> with $${Math.round(topDayEntry[1]).toLocaleString()} earned`,
      });
    }

    // 3. Most frequent customer
    const custCount = {};
    filteredOrders.forEach(o => {
      const name = `${o.firstName || ''} ${o.lastName || ''}`.trim();
      if (!name) return;
      custCount[name] = (custCount[name] || 0) + 1;
    });
    const topCustomer = Object.entries(custCount).sort((a, b) => b[1] - a[1])[0];
    if (topCustomer && topCustomer[1] > 1) {
      result.push({
        icon: '👤',
        color: 'border-violet-100 bg-violet-50 text-violet-800',
        dot:   'bg-violet-400',
        text:  `<strong>${topCustomer[0]}</strong> is your most frequent customer with ${topCustomer[1]} orders`,
      });
    }

    return result;
  }, [filteredOrders]);

  if (!insights.length) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">🧠</span>
        <h3 className="text-sm font-semibold text-gray-800">Smart Insights</h3>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Live</span>
      </div>
      <div className="space-y-2.5">
        {insights.map((ins, i) => (
          <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${ins.color}`}>
            <span className="text-sm shrink-0 mt-0.5">{ins.icon}</span>
            <p className="text-[13px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: ins.text }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Widget renderer (uses filteredOrders for ALL types) ───────
function DashboardWidget({ widget, filteredOrders, chartData }) {
  const { type, title, config = {} } = widget;
  const color = config.color || '#2563eb';
  const { byProduct = [], byStatus = [], revenueOverTime = [] } = chartData;
  const axisProps = { tick: { fontSize: 11, fill: '#9ca3af' }, axisLine: false, tickLine: false };

  const shell = (children) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 h-full flex flex-col overflow-hidden">
      <p className="text-[13px] font-medium text-gray-600 mb-3 shrink-0">{title}</p>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );

  const noData = <EmptyState subtitle="No data for the selected period." />;

  if (type === 'kpi') {
    const kpis = computeKPIs(filteredOrders);
    const m   = config.metric       || '';
    const agg = config.aggregation  || 'Count';
    const fmt = config.format       || 'Number';
    const dec = config.decimals     ?? 0;

    // Map metric + aggregation → value from filteredOrders
    let raw = 0;
    if (m === 'Total amount') {
      // Numeric field — all three aggregations meaningful
      if (agg === 'Sum')          raw = kpis.totalRevenue;
      else if (agg === 'Average') raw = kpis.avgOrderValue;
      else                        raw = kpis.totalOrders;   // Count
    } else if (m === 'Quantity') {
      // Numeric field — sum all quantities
      if (agg === 'Sum')          raw = filteredOrders.reduce((s, o) => s + (o.quantity || 0), 0);
      else if (agg === 'Average') raw = filteredOrders.length ? filteredOrders.reduce((s, o) => s + (o.quantity || 0), 0) / filteredOrders.length : 0;
      else                        raw = kpis.totalOrders;   // Count
    } else if (m === 'Unit price') {
      // Numeric field
      if (agg === 'Sum')          raw = filteredOrders.reduce((s, o) => s + (o.unitPrice || 0), 0);
      else if (agg === 'Average') raw = kpis.avgOrderValue; // avg total ≈ avg unit price proxy
      else                        raw = kpis.totalOrders;
    } else if (m === 'Status') {
      // Text field — count pending
      raw = kpis.pendingOrders;
    } else {
      // All other text fields (Customer name, Product, etc.) → COUNT
      raw = kpis.totalOrders;
    }

    const display = fmt === 'Currency'
      ? '$' + Number(raw).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
      : Number(raw).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 h-full flex flex-col justify-between">
        <p className="text-[13px] font-medium text-gray-500">{title}</p>
        <div>
          <p className="text-[28px] font-semibold text-gray-900 font-mono leading-none tracking-tight mt-2">{display}</p>
          <p className="text-xs text-gray-400 mt-1.5">{m || 'Metric'} · {agg}</p>
        </div>
      </div>
    );
  }

  if (type === 'bar') {
    // Build chart data driven by config.xAxis (groupBy) and config.yAxis (measure)
    const xField = config.xAxis || 'Product';
    const yField = config.yAxis || 'Total amount';

    // Group orders by xField, aggregate yField
    const groupMap = {};
    filteredOrders.forEach(o => {
      let xVal = '';
      if (xField === 'Product')     xVal = o.product || 'Unknown';
      else if (xField === 'Status') xVal = o.status  || 'Unknown';
      else if (xField === 'Created by') xVal = o.createdBy || 'Unknown';
      else xVal = o.product || 'Unknown'; // fallback

      if (!groupMap[xVal]) groupMap[xVal] = { count: 0, totalAmount: 0, quantity: 0, unitPrice: 0 };
      groupMap[xVal].count++;
      groupMap[xVal].totalAmount += o.totalAmount || 0;
      groupMap[xVal].quantity    += o.quantity    || 0;
      groupMap[xVal].unitPrice   += o.unitPrice   || 0;
    });

    let yKey = 'totalAmount';
    let yLabel = 'Revenue';
    if (yField === 'Quantity')     { yKey = 'quantity';    yLabel = 'Quantity'; }
    else if (yField === 'Unit price') { yKey = 'unitPrice'; yLabel = 'Unit Price'; }
    else if (yField === 'Status' || yField === 'Product' || yField === 'Created by') {
      yKey = 'count'; yLabel = 'Count';
    }

    const data = Object.entries(groupMap)
      .map(([name, vals]) => ({ name: name.length > 13 ? name.slice(0, 13) + '…' : name, value: Math.round(vals[yKey] || vals.count) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const showLabel = config.showLabel;
    const isCurrency = yField === 'Total amount' || yField === 'Unit price';

    if (!data.length) return shell(noData);
    return shell(
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
          <XAxis dataKey="name" {...axisProps} angle={-25} textAnchor="end" interval={0}/>
          <YAxis {...axisProps} width={44} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}/>
          <Tooltip formatter={v => [isCurrency ? `$${v.toLocaleString()}` : v, yLabel]}/>
          <Bar dataKey="value" fill={color} radius={[3,3,0,0]} maxBarSize={32}
            label={showLabel ? { position: 'top', fontSize: 9, fill: '#6b7280' } : false}/>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'line') {
    // Always use revenueOverTime (date-based x-axis makes most sense for line charts)
    // But respect config.yAxis to pick the measure
    const yField = config.yAxis || 'Total amount';
    let data;
    if (yField === 'Quantity') {
      // Recompute orders-per-day from filteredOrders
      const dayMap = {};
      filteredOrders.forEach(o => {
        if (!o.createdAt) return;
        const d = new Date(o.createdAt).toISOString().split('T')[0];
        dayMap[d] = (dayMap[d] || 0) + (o.quantity || 0);
      });
      data = Object.entries(dayMap).sort(([a],[b])=>a.localeCompare(b)).map(([date,val]) => ({ name: date.slice(5), value: val }));
    } else {
      data = revenueOverTime.slice(-14).map(d => ({ name: d.date.slice(5), value: d.revenue }));
    }
    const showLabel = config.showLabel;
    if (!data.length) return shell(noData);
    return shell(
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
          <XAxis dataKey="name" {...axisProps}/>
          <YAxis {...axisProps} width={44}/>
          <Tooltip/>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }}
            label={showLabel ? { position: 'top', fontSize: 9, fill: '#6b7280' } : false}/>
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'area') {
    const yField = config.yAxis || 'Total amount';
    let data;
    if (yField === 'Quantity') {
      const dayMap = {};
      filteredOrders.forEach(o => {
        if (!o.createdAt) return;
        const d = new Date(o.createdAt).toISOString().split('T')[0];
        dayMap[d] = (dayMap[d] || 0) + (o.quantity || 0);
      });
      data = Object.entries(dayMap).sort(([a],[b])=>a.localeCompare(b)).map(([date,val]) => ({ name: date.slice(5), value: val }));
    } else {
      data = revenueOverTime.slice(-14).map(d => ({ name: d.date.slice(5), value: d.revenue }));
    }
    const showLabel = config.showLabel;
    if (!data.length) return shell(noData);
    return shell(
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`ag_${widget.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
          <XAxis dataKey="name" {...axisProps}/>
          <YAxis {...axisProps} width={44}/>
          <Tooltip/>
          <Area type="monotone" dataKey="value" stroke={color} fill={`url(#ag_${widget.id})`} strokeWidth={2} dot={false}
            label={showLabel ? { position: 'top', fontSize: 9, fill: '#6b7280' } : false}/>
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'scatter') {
    // Scatter requires two numeric axes — use Quantity vs Total amount by default
    // config.xAxis / config.yAxis should be numeric fields for scatter
    const xField = config.xAxis || 'Quantity';
    const yField = config.yAxis || 'Total amount';

    const getVal = (o, field) => {
      if (field === 'Quantity')     return o.quantity    || 0;
      if (field === 'Unit price')   return o.unitPrice   || 0;
      if (field === 'Total amount') return o.totalAmount || 0;
      return 0; // non-numeric fields default to 0 for scatter
    };

    const data = filteredOrders.slice(0, 50).map((o, i) => ({
      x: getVal(o, xField),
      y: getVal(o, yField),
    })).filter(d => d.x !== 0 || d.y !== 0);

    if (!data.length) return shell(noData);
    return shell(
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
          <XAxis type="number" dataKey="x" name={xField} {...axisProps}
            label={{ value: xField, position: 'insideBottom', offset: -8, fontSize: 10, fill: '#9ca3af' }}/>
          <YAxis type="number" dataKey="y" name={yField} {...axisProps} width={44}
            tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}/>
          <Tooltip cursor={{ strokeDasharray: '3 3' }}
            formatter={(v, name) => [name === 'x' ? v : `$${v.toLocaleString()}`, name === 'x' ? xField : yField]}/>
          <Scatter data={data} fill={color}/>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'pie') {
    // Build pie data based on config.chartData field
    const groupField = config.chartData || 'Status';
    const pieMap = {};
    filteredOrders.forEach(o => {
      let key = '';
      if (groupField === 'Status')      key = o.status     || 'Unknown';
      else if (groupField === 'Product') key = o.product    || 'Unknown';
      else if (groupField === 'Created by') key = o.createdBy || 'Unknown';
      else if (groupField === 'Quantity')   key = String(o.quantity ?? 0);
      else if (groupField === 'Total amount') key = 'Revenue'; // group total
      else key = o.status || 'Unknown';
      pieMap[key] = (pieMap[key] || 0) + 1;
    });
    const data = Object.entries(pieMap).map(([name, count]) => ({ name, value: count }));
    if (!data.length) return shell(noData);
    return shell(
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="45%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
            {data.map((d, i) => <Cell key={i} fill={STATUS_COLORS[d.name] || PIE_PALETTE[i % PIE_PALETTE.length]}/>)}
          </Pie>
          <Tooltip formatter={(v, n) => [v + ' orders', n]}/>
          {config.showLegend && (
            <Legend iconSize={8} iconType="circle" formatter={v => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>}/>
          )}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'table') {
    const cols     = config.columns?.length ? config.columns : ['Customer name', 'Product', 'Total amount', 'Status', 'Order date'];
    const pageSize = parseInt(config.pagination || '10', 10);
    const headerBg = config.headerBg || '#54bd95';
    const fontSize = config.fontSize || 13;

    // Apply widget-level filters if enabled
    const FIELD_MAP = {
      'Status':       o => o.status || '',
      'Product':      o => o.product || '',
      'Customer name': o => `${o.firstName||''} ${o.lastName||''}`.trim(),
      'Order date':   o => o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '',
      'Total amount': o => String(o.totalAmount ?? ''),
      'Quantity':     o => String(o.quantity ?? ''),
    };
    let tableSource = filteredOrders;
    if (config.applyFilter && config.filters?.length) {
      tableSource = filteredOrders.filter(order =>
        config.filters.every(f => {
          if (!f.field || !f.value) return true;
          const accessor = FIELD_MAP[f.field] || (() => '');
          return accessor(order).toLowerCase().includes(f.value.toLowerCase());
        })
      );
    }
    // Apply sort
    if (config.sortBy === 'Ascending') {
      tableSource = [...tableSource].sort((a, b) => (a.totalAmount || 0) - (b.totalAmount || 0));
    } else if (config.sortBy === 'Descending') {
      tableSource = [...tableSource].sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
    }
    // 'Order date' default — already sorted newest first from filteredOrders
    const rows = tableSource.slice(0, pageSize);
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <p className="text-[13px] font-medium text-gray-600">{title}</p>
        </div>
        <div className="flex-1 overflow-auto">
          {!rows.length ? (
            <EmptyState subtitle="No orders for this period." />
          ) : (
            <table className="w-full" style={{ fontSize }}>
              <thead>
                <tr style={{ backgroundColor: headerBg }}>
                  {cols.map(c => <th key={c} className="text-left px-3 py-2 text-white font-medium text-xs whitespace-nowrap">{c}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((o, i) => (
                  <tr key={o._id || i} className="hover:bg-gray-50">
                    {cols.map(c => (
                      <td key={c} className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {(COL_LABELS[c] || (() => '—'))(o)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-center text-gray-300 text-sm h-full">{title}</div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const [allOrders,     setAllOrders]     = useState([]);
  const [widgets,       setWidgets]       = useState([]);
  const [dashName,      setDashName]      = useState('Dashboard');
  const [range,         setRange]         = useState('all');
  const [loading,       setLoading]       = useState(true);
  const [lastUpdated,   setLastUpdated]   = useState(null);
  const [minutesAgo,    setMinutesAgo]    = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const [gridWidth,     setGridWidth]     = useState(1200); // measured from container
  const refreshTimer = useRef(null);
  const minuteTimer  = useRef(null);
  const gridRef      = useRef(null);

  // ── ResizeObserver: measure widget grid width for responsive cols ─────────
  useEffect(() => {
    const measure = () => {
      if (gridRef.current) setGridWidth(gridRef.current.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (gridRef.current) ro.observe(gridRef.current);
    return () => ro.disconnect();
  }, []);

  // ── ONE filtered dataset drives everything ─────────────────
  const filteredOrders = useMemo(
    () => getFilteredOrders(allOrders, range),
    [allOrders, range]
  );

  // Computed KPIs — always in sync with filteredOrders
  const kpis = useMemo(() => computeKPIs(filteredOrders), [filteredOrders]);

  // ── KPI % change vs previous equal period ──────────────────────
  const pctChanges = useMemo(() => {
    if (range === 'all' || !allOrders.length) return {};
    const now = new Date();
    const days = { today: 1, last7: 7, last30: 30 }[range] || 0;
    if (!days) return {};

    const cutCur  = new Date(now); cutCur.setDate(now.getDate() - days);
    const cutPrev = new Date(now); cutPrev.setDate(now.getDate() - days * 2);

    const cur  = allOrders.filter(o => new Date(o.createdAt) >= cutCur);
    const prev = allOrders.filter(o => { const d = new Date(o.createdAt); return d >= cutPrev && d < cutCur; });

    const curRev  = cur.reduce((s, o)  => s + (o.totalAmount || 0), 0);
    const prevRev = prev.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const curCnt  = cur.length;
    const prevCnt = prev.length;
    const curPend = cur.filter(o => o.status === 'Pending').length;
    const prevPend= prev.filter(o => o.status === 'Pending').length;

    const pct = (cur, prv) => prv > 0 ? ((cur - prv) / prv * 100) : null;
    return {
      revenue: pct(curRev,  prevRev),
      orders:  pct(curCnt,  prevCnt),
      pending: pct(curPend, prevPend),
    };
  }, [allOrders, range]);

  // Chart data — always in sync with filteredOrders
  const chartData = useMemo(() => computeChartData(filteredOrders), [filteredOrders]);

  // Insights derived from kpis + chartData — all from same dataset
  const insights = useMemo(() => {
    const list = [];
    const { totalRevenue, totalOrders, avgOrderValue, pendingOrders, topProduct } = kpis;
    if (topProduct) {
      list.push({ type: 'info', icon: '🔥', message: `Top product: ${topProduct.name} — ${topProduct.count} orders · $${Math.round(topProduct.revenue).toLocaleString()}` });
    }
    if (avgOrderValue > 0) {
      list.push({ type: 'info', icon: '💡', message: `Avg order value: $${avgOrderValue.toFixed(2)}` });
    }
    if (pendingOrders > 5) {
      list.push({ type: 'warning', icon: '⚠️', message: `${pendingOrders} pending orders need attention` });
    }
    if (totalOrders === 0 && range !== 'all') {
      list.push({ type: 'info', icon: '📅', message: `No orders found for the selected period` });
    }
    return list;
  }, [kpis, range]);

  // ── Minute counter ─────────────────────────────────────────
  useEffect(() => {
    minuteTimer.current = setInterval(() => {
      if (lastUpdated) setMinutesAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 60000));
    }, 30000);
    return () => clearInterval(minuteTimer.current);
  }, [lastUpdated]);

  // ── Data loading ───────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch ALL orders once — filtering is done client-side for perfect consistency
      const [ordRes, dbRes] = await Promise.all([
        getOrders({ limit: 2000 }),
        getDashboard(),
      ]);
      setAllOrders(ordRes.data.data || []);
      const db = dbRes.data.data;
      setWidgets(db?.widgets || []);
      setDashName(db?.name || 'Dashboard');
      setLastUpdated(new Date());
      setMinutesAgo(0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    refreshTimer.current = setInterval(load, 30000);
    return () => clearInterval(refreshTimer.current);
  }, [load]);

  const { byProduct, byStatus, revenueOverTime } = chartData;
  const updatedText = minutesAgo === 0 ? 'Just now' : `${minutesAgo} min${minutesAgo === 1 ? '' : 's'} ago`;

  // ── Loading ─────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-blue-100 border-t-blue-500 rounded-full animate-spin"/>
        <p className="text-sm text-gray-400">Loading dashboard…</p>
      </div>
    </div>
  );

  // ── No widgets configured ──────────────────────────────────
  if (widgets.length === 0 && !showTemplates) return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">No widgets configured</p>
      </div>
      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center py-20 px-8 text-center">
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-800 mb-2">No widgets configured</h2>
        <p className="text-sm text-gray-400 max-w-sm mb-6">Choose a template to get started, or build your own dashboard.</p>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowTemplates(true)}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Choose Template
          </button>
          <button onClick={() => navigate('/dashboard/configure')}
            className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Configure Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  // ── Template picker ────────────────────────────────────────
  if (showTemplates) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Choose a Template</h1>
          <p className="text-sm text-gray-400 mt-0.5">Pick a starting point</p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {TEMPLATES.map(t => (
          <button key={t.id}
            onClick={() => navigate('/dashboard/configure', { state: { template: t.id } })}
            className="bg-white border border-gray-200 rounded-xl p-6 text-left hover:border-blue-400 hover:shadow-sm transition-all group">
            <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 mb-1">{t.label}</p>
            <p className="text-xs text-gray-400 leading-relaxed">{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Full dashboard ─────────────────────────────────────────
  const rangeLabel = DATE_RANGES.find(r => r.value === range)?.label || 'All Time';

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{dashName}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Last updated: {lastUpdated ? updatedText : '—'}
            {' · '}{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} in view
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range filter */}
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden divide-x divide-gray-100">
            {DATE_RANGES.map(r => (
              <button key={r.value} onClick={() => setRange(r.value)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${range === r.value ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {r.label}
              </button>
            ))}
          </div>
          {/* Export — both use filteredOrders */}
          <button
            onClick={() => exportOrdersCSV(filteredOrders)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 bg-white transition-colors">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            CSV
          </button>
          <button
            onClick={() => exportDashboardPDF({ ...kpis, rangeLabel }, insights, filteredOrders)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 bg-white transition-colors">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
            PDF
          </button>
          <button onClick={() => navigate('/dashboard/configure')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Configure
          </button>
        </div>
      </div>

      {/* ── KPI Cards — ONE section, no duplicates ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Revenue"
          value={`$${kpis.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={rangeLabel}
          accent="bg-blue-500"
          pctChange={pctChanges.revenue ?? null}
        />
        <KPICard
          label="Total Orders"
          value={kpis.totalOrders.toLocaleString()}
          sub={rangeLabel}
          accent="bg-emerald-500"
          pctChange={pctChanges.orders ?? null}
        />
        <KPICard
          label="Avg Order Value"
          value={`$${kpis.avgOrderValue.toFixed(2)}`}
          sub="Per order"
          accent="bg-violet-500"
        />
        <KPICard
          label="Pending Orders"
          value={String(kpis.pendingOrders)}
          sub={kpis.pendingOrders > 5 ? 'Needs attention' : 'On track'}
          accent="bg-amber-500"
          pctChange={pctChanges.pending ?? null}
        />
      </div>

      {/* ── Period comparison + Smart insights ── */}
      <SmartInsights filteredOrders={filteredOrders} range={range} />

      {/* ── Saved widgets — responsive 12/8/4 col grid ── */}
      {/* gridRef always renders so ResizeObserver attaches on mount */}
      <div ref={gridRef} style={{ display: widgets.length > 0 ? 'grid' : 'none', gridTemplateColumns: `repeat(${getGridCols(gridWidth)}, 1fr)`, gap: '1rem' }}>
        {widgets.map(widget => {
          const cols = getGridCols(gridWidth);
          const savedW = widget.layout?.w || 4;
          const w = Math.min(Math.max(savedW, 1), cols);
          const h = widget.layout?.h || 4;
          return (
            <div key={widget.id} style={{ gridColumn: `span ${w}`, minHeight: `${h * 60}px` }}>
              <DashboardWidget
                widget={widget}
                filteredOrders={filteredOrders}
                chartData={chartData}
              />
            </div>
          );
        })}
      </div>

      {/* ── Analytics Overview — INSIGHTS ONLY (no duplicate KPIs) ── */}
      <div className="border-t border-gray-100 pt-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-700">Analytics Overview</h2>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {insights.map((ins, i) => {
              const s = {
                positive: 'bg-emerald-50 border-emerald-100 text-emerald-700',
                warning:  'bg-amber-50 border-amber-100 text-amber-700',
                negative: 'bg-red-50 border-red-100 text-red-700',
                info:     'bg-blue-50 border-blue-100 text-blue-700',
              }[ins.type] || 'bg-blue-50 border-blue-100 text-blue-700';
              return (
                <div key={i} className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border ${s}`}>
                  <span className="shrink-0 mt-0.5">{ins.icon}</span>
                  <span className="text-[13px] leading-snug">{ins.message}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Charts — only render when data exists */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Pie chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Orders by Status</h3>
            {byStatus.length === 0 ? (
              <EmptyState subtitle="No orders for the selected period." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byStatus.map(d => ({ name: d.name, value: d.count }))}
                    cx="50%" cy="45%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value">
                    {byStatus.map((d, i) => <Cell key={i} fill={STATUS_COLORS[d.name] || PIE_PALETTE[i % PIE_PALETTE.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v + ' orders', n]}/>
                  <Legend iconSize={8} iconType="circle" formatter={v => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bar chart */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Revenue by Product</h3>
            {byProduct.length === 0 ? (
              <EmptyState subtitle="No orders for the selected period." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byProduct.slice(0, 7).map(d => ({
                  name: d.product.length > 13 ? d.product.slice(0, 13) + '…' : d.product,
                  revenue: d.revenue,
                }))} margin={{ top: 4, right: 8, left: 0, bottom: 44 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} angle={-28} textAnchor="end" interval={0}/>
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52}
                    tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}/>
                  <Tooltip/>
                  <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={34}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent orders table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Recent Orders</h3>
            <span className="text-xs text-gray-400">{filteredOrders.length} record{filteredOrders.length !== 1 ? 's' : ''}</span>
          </div>
          {filteredOrders.length === 0 ? (
            <EmptyState title="No orders found" subtitle="No orders match the selected date range." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Customer', 'Product', 'Amount', 'Status', 'Date'].map(c => (
                      <th key={c} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOrders.slice(0, 10).map(o => {
                    const sc = STATUS_COLORS[o.status] || '#9ca3af';
                    return (
                      <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[13px] text-gray-800">{o.firstName} {o.lastName}</p>
                          <p className="text-xs text-gray-400">{o.email}</p>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-gray-600">{o.product}</td>
                        <td className="px-4 py-3 font-mono text-[13px] font-medium text-gray-800">${(o.totalAmount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${sc}20`, color: sc }}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
