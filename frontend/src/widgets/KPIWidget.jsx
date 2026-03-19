import React from 'react';

const METRIC_CONFIG = {
  revenue:  { key: 'totalRevenue',  prefix: '$', label: 'Total Revenue',   icon: '💰', color: 'text-blue-600',   bg: 'bg-blue-50'   },
  orders:   { key: 'totalOrders',   prefix: '',  label: 'Total Orders',    icon: '📦', color: 'text-green-600',  bg: 'bg-green-50'  },
  avgOrder: { key: 'avgOrderValue', prefix: '$', label: 'Avg Order Value', icon: '📊', color: 'text-violet-600', bg: 'bg-violet-50' },
  pending:  { key: 'pendingOrders', prefix: '',  label: 'Pending Orders',  icon: '⏳', color: 'text-amber-600',  bg: 'bg-amber-50'  },
};

export default function KPIWidget({ widget, analytics }) {
  const metric   = widget.config?.metric || 'revenue';
  const decimals = widget.config?.decimals ?? 2;
  const cfg      = METRIC_CONFIG[metric] || METRIC_CONFIG.revenue;
  const raw      = analytics?.summary?.[cfg.key] ?? 0;
  const formatted = typeof raw === 'number'
    ? raw.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : String(raw);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 h-full flex flex-col justify-between min-h-[100px]">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500 leading-tight">{widget.title}</p>
        <span className={`w-9 h-9 ${cfg.bg} rounded-xl flex items-center justify-center text-lg shrink-0 ml-2`}>
          {cfg.icon}
        </span>
      </div>
      <div>
        <div className={`text-[28px] font-bold font-mono tracking-tight ${cfg.color} leading-none mt-3`}>
          {cfg.prefix}{formatted}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">{cfg.label}</p>
      </div>
    </div>
  );
}
