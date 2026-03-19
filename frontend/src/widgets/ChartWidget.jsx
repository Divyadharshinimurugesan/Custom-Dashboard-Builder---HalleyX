import React from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const PALETTE = ['#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6','#f97316','#06b6d4','#ec4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono">
          {p.name}: {typeof p.value === 'number' && p.name?.toLowerCase().includes('revenue') ? `$${p.value.toLocaleString()}` : p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function ChartWidget({ widget, analytics, compact }) {
  const { type, title, config = {} } = widget;
  const color   = config.color || PALETTE[0];
  const yKey    = config.yKey  || 'revenue';
  const height  = compact ? 160 : 230;

  // Prepare data per chart type
  let data = [];

  if (type === 'pie') {
    data = (analytics?.byStatus || []).map(d => ({ name: d.name, value: d.count }));
  } else if (type === 'bar' && config.xKey === 'product') {
    data = (analytics?.byProduct || []).map(d => ({
      name: d.product?.length > 12 ? d.product.slice(0, 12) + '…' : d.product,
      revenue: Math.round(d.revenue || 0),
      count: d.count || 0,
    }));
  } else {
    // line / area / bar-by-date
    data = (analytics?.revenueOverTime || []).map(d => ({
      name: d.date ? d.date.slice(5) : '',
      revenue: Math.round(d.revenue || 0),
      orders: d.orders || 0,
    }));
  }

  const isEmpty = data.length === 0;

  const commonAxisProps = {
    tick: { fontSize: 11, fill: '#9ca3af', fontFamily: 'DM Sans' },
    axisLine: false,
    tickLine: false,
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 h-full flex flex-col">
      <p className="text-sm font-semibold text-gray-700 mb-3 shrink-0">{title}</p>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center text-gray-300">
          <div className="text-center">
            <div className="text-3xl mb-1">📭</div>
            <p className="text-xs">No data available</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height={height}>
            {type === 'bar' ? (
              <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" {...commonAxisProps} />
                <YAxis {...commonAxisProps} width={48} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            ) : type === 'line' ? (
              <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" {...commonAxisProps} />
                <YAxis {...commonAxisProps} width={48} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            ) : type === 'area' ? (
              <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id={`areaGrad_${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" {...commonAxisProps} />
                <YAxis {...commonAxisProps} width={48} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.5}
                  fill={`url(#areaGrad_${widget.id})`} dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            ) : (
              /* Pie */
              <PieChart>
                <Pie
                  data={data} cx="50%" cy="50%"
                  innerRadius={compact ? 35 : 50}
                  outerRadius={compact ? 65 : 90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend
                  formatter={(value) => <span style={{ fontSize: 11, color: '#6b7280' }}>{value}</span>}
                  iconSize={8}
                  iconType="circle"
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
