import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { getDashboard, saveDashboard, getAnalytics, getOrders } from '../services/api';
import { STATUS_COLORS, PIE_PALETTE } from '../utils/helpers';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ── Constants ──────────────────────────────────────────────────
const WIDGET_TYPES = [
  { type:'kpi',     label:'KPI Card',    icon:'📊', defaultW:2,  defaultH:2 },
  { type:'bar',     label:'Bar Chart',   icon:'📈', defaultW:5,  defaultH:5 },
  { type:'line',    label:'Line Chart',  icon:'📉', defaultW:5,  defaultH:5 },
  { type:'area',    label:'Area Chart',  icon:'🌊', defaultW:5,  defaultH:5 },
  { type:'scatter', label:'Scatter Plot',icon:'✦',  defaultW:5,  defaultH:5 },
  { type:'pie',     label:'Pie Chart',   icon:'🥧', defaultW:4,  defaultH:4 },
  { type:'table',   label:'Table',       icon:'📋', defaultW:4,  defaultH:4 },
];

const KPI_METRICS = ['Customer ID','Customer name','Email id','Address','Order date','Product','Created by','Status','Total amount','Unit price','Quantity'];
const NUMERIC_METRICS = ['Total amount','Unit price','Quantity'];
const CHART_AXES = ['Product','Quantity','Unit price','Total amount','Status','Created by'];
const PIE_DATA_OPTS = ['Product','Quantity','Unit price','Total amount','Status','Created by'];
const TABLE_COLS = ['Customer ID','Customer name','Email id','Phone number','Address','Order ID','Order date','Product','Quantity','Unit price','Total amount','Status','Created by'];

const AGGREGATIONS = ['Sum','Average','Count'];
const DATA_FORMATS = ['Number','Currency'];
const SORT_OPTS = ['Ascending','Descending','Order date'];
const PAGE_SIZES = ['5','10','15'];

const TEMPLATE_WIDGETS = {
  sales: [
    { id:'t1', type:'kpi',   title:'Total Revenue',  config:{ metric:'Total amount',   aggregation:'Sum',   format:'Currency', decimals:2 }, layout:{x:0,y:0,w:2,h:2} },
    { id:'t2', type:'kpi',   title:'Total Orders',   config:{ metric:'Customer ID',     aggregation:'Count', format:'Number',   decimals:0 }, layout:{x:2,y:0,w:2,h:2} },
    { id:'t3', type:'kpi',   title:'Avg Order Value', config:{ metric:'Total amount',   aggregation:'Average',format:'Currency',decimals:2 }, layout:{x:4,y:0,w:2,h:2} },
    { id:'t4', type:'bar',   title:'Revenue by Product', config:{ xAxis:'Product', yAxis:'Total amount', color:'#2563eb', showLabel:false }, layout:{x:0,y:2,w:7,h:5} },
    { id:'t5', type:'pie',   title:'Orders by Status',   config:{ chartData:'Status',  showLegend:true }, layout:{x:7,y:2,w:5,h:5} },
  ],
  orders: [
    { id:'t1', type:'kpi',   title:'Total Orders',   config:{ metric:'Customer ID',    aggregation:'Count', format:'Number', decimals:0 }, layout:{x:0,y:0,w:3,h:2} },
    { id:'t2', type:'kpi',   title:'Pending Orders', config:{ metric:'Status',          aggregation:'Count', format:'Number', decimals:0 }, layout:{x:3,y:0,w:3,h:2} },
    { id:'t3', type:'pie',   title:'Orders by Status', config:{ chartData:'Status', showLegend:true }, layout:{x:0,y:2,w:4,h:5} },
    { id:'t4', type:'bar',   title:'Orders by Product',config:{ xAxis:'Product', yAxis:'Quantity', color:'#7c3aed', showLabel:false }, layout:{x:4,y:2,w:8,h:5} },
    { id:'t5', type:'table', title:'Recent Orders', config:{ columns:['Customer name','Product','Total amount','Status','Order date'], sortBy:'Order date', pagination:'10', fontSize:14, headerBg:'#54bd95', applyFilter:false }, layout:{x:0,y:7,w:12,h:4} },
  ],
  product: [
    { id:'t1', type:'kpi',   title:'Total Revenue',  config:{ metric:'Total amount',  aggregation:'Sum',   format:'Currency', decimals:2 }, layout:{x:0,y:0,w:3,h:2} },
    { id:'t2', type:'kpi',   title:'Top Qty',        config:{ metric:'Quantity',       aggregation:'Sum',   format:'Number',   decimals:0 }, layout:{x:3,y:0,w:3,h:2} },
    { id:'t3', type:'bar',   title:'Revenue by Product', config:{ xAxis:'Product', yAxis:'Total amount', color:'#059669', showLabel:false }, layout:{x:0,y:2,w:12,h:5} },
    { id:'t4', type:'line',  title:'Quantity Trend',     config:{ xAxis:'Order date',  yAxis:'Quantity',    color:'#d97706', showLabel:false }, layout:{x:0,y:7,w:6,h:4} },
    { id:'t5', type:'area',  title:'Revenue Trend',      config:{ xAxis:'Order date',  yAxis:'Total amount',color:'#2563eb', showLabel:false }, layout:{x:6,y:7,w:6,h:4} },
  ],
  blank: [],
};

let widgetCounter = 500;

// ── Widget Preview ─────────────────────────────────────────────
function WidgetPreview({ widget, analytics, orders = [] }) {
  const { type, title, config={} } = widget;
  const color = config.color || '#2563eb';
  const h = 160;

  const byProduct = analytics?.byProduct || [];
  const byStatus  = analytics?.byStatus  || [];
  const revTime   = analytics?.revenueOverTime || [];
  const summary   = analytics?.summary || {};

  let previewVal = '';
  if (type === 'kpi') {
    const m = config.metric || '';
    if (m === 'Total amount')  previewVal = `$${(summary.totalRevenue||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
    else if (m === 'Quantity') previewVal = summary.totalOrders?.toString() || '0';
    else if (m === 'Unit price') previewVal = `$${(summary.avgOrderValue||0).toFixed(2)}`;
    else                       previewVal = (summary.totalOrders||0).toString();
  }

  if (type === 'kpi') return (
    <div className="p-4 h-full flex flex-col justify-between">
      <p className="text-xs text-gray-500 font-medium">{title}</p>
      <p className="text-2xl font-bold font-mono text-gray-900 mt-2">{previewVal || '—'}</p>
      <p className="text-[11px] text-gray-400 mt-1">{config.metric || 'Metric'}</p>
    </div>
  );

  const axisProps = { tick:{fontSize:10,fill:'#9ca3af'}, axisLine:false, tickLine:false };

  if (type === 'bar') {
    const data = byProduct.slice(0,5).map(d=>({ name:d.product?.slice(0,8)||'', value:Math.round(d.revenue||d.count||0) }));
    return (
      <div className="p-3 h-full flex flex-col">
        <p className="text-xs font-medium text-gray-600 mb-2">{title}</p>
        <ResponsiveContainer width="100%" height={h}>
          <BarChart data={data} margin={{top:4,right:4,left:0,bottom:20}}>
            <XAxis dataKey="name" {...axisProps} angle={-20} textAnchor="end"/>
            <YAxis {...axisProps} width={30} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
            <Bar dataKey="value" fill={color} radius={[3,3,0,0]} maxBarSize={20}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'line') {
    const data = revTime.slice(-8).map(d=>({ name:d.date?.slice(5)||'', value:Math.round(d.revenue||0) }));
    return (
      <div className="p-3 h-full flex flex-col">
        <p className="text-xs font-medium text-gray-600 mb-2">{title}</p>
        <ResponsiveContainer width="100%" height={h}>
          <LineChart data={data}><XAxis dataKey="name" {...axisProps}/><YAxis {...axisProps} width={30}/>
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'area') {
    const data = revTime.slice(-8).map(d=>({ name:d.date?.slice(5)||'', value:Math.round(d.revenue||0) }));
    return (
      <div className="p-3 h-full flex flex-col">
        <p className="text-xs font-medium text-gray-600 mb-2">{title}</p>
        <ResponsiveContainer width="100%" height={h}>
          <AreaChart data={data}>
            <defs><linearGradient id={`ag${widget.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2}/><stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient></defs>
            <XAxis dataKey="name" {...axisProps}/><YAxis {...axisProps} width={30}/>
            <Area type="monotone" dataKey="value" stroke={color} fill={`url(#ag${widget.id})`} strokeWidth={2} dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'scatter') {
    const data = byProduct.slice(0,8).map((d,i)=>({ x:i+1, y:Math.round(d.revenue||0) }));
    return (
      <div className="p-3 h-full flex flex-col">
        <p className="text-xs font-medium text-gray-600 mb-2">{title}</p>
        <ResponsiveContainer width="100%" height={h}>
          <ScatterChart><XAxis type="number" dataKey="x" {...axisProps}/><YAxis type="number" dataKey="y" {...axisProps} width={30}/>
            <Scatter data={data} fill={color}/>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'pie') {
    const data = byStatus.map(d=>({ name:d.name, value:d.count }));
    const PIE_C = ['#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6'];
    return (
      <div className="p-3 h-full flex flex-col">
        <p className="text-xs font-medium text-gray-600 mb-1">{title}</p>
        <ResponsiveContainer width="100%" height={h}>
          <PieChart><Pie data={data} cx="50%" cy="50%" outerRadius={55} dataKey="value">
            {data.map((_,i)=><Cell key={i} fill={PIE_C[i%PIE_C.length]}/>)}
          </Pie>
          {config.showLegend && <Legend iconSize={6} formatter={v=><span style={{fontSize:10,color:'#6b7280'}}>{v}</span>}/>}
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'table') {
    const cols = config.columns?.slice(0,4) || ['Customer name','Product','Status','Total amount'];
    const pageSize = parseInt(config.pagination || '5', 10);
    const rows = orders.slice(0, pageSize);
    const COL_MAP = {
      'Customer name':  o => `${o.firstName||''} ${o.lastName||''}`.trim(),
      'Email id':       o => o.email || '—',
      'Phone number':   o => o.phone || '—',
      'Product':        o => o.product || '—',
      'Quantity':       o => o.quantity?.toString() || '—',
      'Unit price':     o => o.unitPrice != null ? `$${Number(o.unitPrice).toFixed(2)}` : '—',
      'Total amount':   o => o.totalAmount != null ? `$${Number(o.totalAmount).toFixed(2)}` : '—',
      'Status':         o => o.status || '—',
      'Order date':     o => o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—',
      'Created by':     o => o.createdBy || '—',
      'Customer ID':    o => o._id?.slice(-6).toUpperCase() || '—',
      'Order ID':       o => o._id?.slice(-6).toUpperCase() || '—',
      'Address':        o => o.address ? `${o.address.city}, ${o.address.country}` : '—',
    };
    return (
      <div className="p-3 h-full flex flex-col overflow-hidden">
        <p className="text-xs font-medium text-gray-600 mb-2">{title}</p>
        <table className="w-full text-[10px]">
          <thead><tr style={{ backgroundColor: config.headerBg||'#54bd95' }}>
            {cols.map(c=><th key={c} className="text-left px-2 py-1 text-white font-medium truncate">{c}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={cols.length} className="px-2 py-3 text-center text-gray-300">No data — add orders first</td></tr>
            ) : rows.map((o,i)=>(
              <tr key={o._id||i} className="border-b border-gray-50">
                {cols.map(c=><td key={c} className="px-2 py-1 text-gray-600 truncate max-w-20">{(COL_MAP[c]||((r)=>'—'))(o)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <div className="flex items-center justify-center h-full text-gray-300 text-xs">{title}</div>;
}

// ── Stable Section component — defined OUTSIDE ConfigPanel ───────────────────
// If defined inside, it becomes a new function reference every render,
// causing React to unmount+remount children and destroying input focus.
function Section({ title, children }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ── Widget Config Panel ────────────────────────────────────────
// key={widget.id} on the parent ensures this only remounts when switching widgets,
// not on every parent re-render — this is the fix for input focus loss.
function ConfigPanel({ widget, onUpdate, onClose }) {
  const [cfg, setCfg] = useState(() => ({
    ...widget,
    config: { ...widget.config },
    layout: { ...widget.layout },
  }));
  // Stable callbacks — these never change between renders of ConfigPanel
  const set = useCallback((key, val) => setCfg(c => ({ ...c, [key]: val })), []);
  const setCfgField = useCallback((key, val) => setCfg(c => ({ ...c, config: { ...c.config, [key]: val } })), []);

  const isNumeric = (metric) => NUMERIC_METRICS.includes(metric);

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-300 transition-colors";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1.5";

  const widgetTypeLabel = WIDGET_TYPES.find(w=>w.type===widget.type)?.label || widget.type;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20" onClick={onClose}/>
      <div className="w-80 bg-white h-full shadow-2xl flex flex-col border-l border-gray-200 overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Widget Settings</h3>
            <p className="text-xs text-gray-400 mt-0.5">{widgetTypeLabel}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-1">

          {/* Widget title */}
          <Section title="Widget title">
            <div>
              <label className={labelCls}>Title <span className="text-red-500">*</span></label>
              <input className={inputCls} value={cfg.title} onChange={e=>set('title',e.target.value)} placeholder="Untitled"/>
            </div>
            <div>
              <label className={labelCls}>Widget type</label>
              <input className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`} value={widgetTypeLabel} readOnly/>
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea className={`${inputCls} resize-none`} rows={2} value={cfg.description||''} onChange={e=>set('description',e.target.value)} placeholder="Optional description"/>
            </div>
          </Section>

          {/* Widget size */}
          <Section title="Widget size">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Width (Columns) <span className="text-red-500">*</span></label>
                <input type="number" min="1" max="12" className={inputCls}
                  value={cfg.layout?.w || WIDGET_TYPES.find(t=>t.type===widget.type)?.defaultW || 4}
                  onChange={e=>set('layout',{...cfg.layout, w:Math.max(1,parseInt(e.target.value)||1)})}/>
              </div>
              <div>
                <label className={labelCls}>Height (Rows) <span className="text-red-500">*</span></label>
                <input type="number" min="1" className={inputCls}
                  value={cfg.layout?.h || WIDGET_TYPES.find(t=>t.type===widget.type)?.defaultH || 4}
                  onChange={e=>set('layout',{...cfg.layout, h:Math.max(1,parseInt(e.target.value)||1)})}/>
              </div>
            </div>
          </Section>

          {/* KPI Data Settings */}
          {cfg.type === 'kpi' && (
            <Section title="Data setting">
              <div>
                <label className={labelCls}>Select metric <span className="text-red-500">*</span></label>
                <select className={inputCls} value={cfg.config?.metric||''} onChange={e=>setCfgField('metric',e.target.value)}>
                  <option value="">Select…</option>
                  {KPI_METRICS.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Aggregation <span className="text-red-500">*</span></label>
                <select className={`${inputCls} ${!isNumeric(cfg.config?.metric||'') ? 'opacity-60 cursor-not-allowed' : ''}`}
                  disabled={!isNumeric(cfg.config?.metric||'')}
                  value={cfg.config?.aggregation||'Count'} onChange={e=>setCfgField('aggregation',e.target.value)}>
                  {AGGREGATIONS.map(a=><option key={a}>{a}</option>)}
                </select>
                {!isNumeric(cfg.config?.metric||'') && <p className="text-xs text-gray-400 mt-1">Only available for numeric fields</p>}
              </div>
              <div>
                <label className={labelCls}>Data format <span className="text-red-500">*</span></label>
                <select className={inputCls} value={cfg.config?.format||'Number'} onChange={e=>setCfgField('format',e.target.value)}>
                  {DATA_FORMATS.map(f=><option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Decimal precision <span className="text-red-500">*</span></label>
                <input type="number" min="0" className={inputCls} value={cfg.config?.decimals??0} onChange={e=>setCfgField('decimals',Math.max(0,parseInt(e.target.value)||0))}/>
              </div>
            </Section>
          )}

          {/* Chart (bar/line/area/scatter) Data Settings */}
          {['bar','line','area','scatter'].includes(cfg.type) && (
            <>
              <Section title="Data setting">
                <div>
                  <label className={labelCls}>X-Axis data <span className="text-red-500">*</span></label>
                  <select className={inputCls} value={cfg.config?.xAxis||''} onChange={e=>setCfgField('xAxis',e.target.value)}>
                    <option value="">Select…</option>
                    {/* Scatter requires numeric axes; bar/line/area allow categorical */}
                    {(cfg.type === 'scatter' ? NUMERIC_METRICS : CHART_AXES).map(a=><option key={a}>{a}</option>)}
                  </select>
                  {cfg.type === 'scatter' && <p className="text-xs text-gray-400 mt-1">Scatter requires numeric fields</p>}
                </div>
                <div>
                  <label className={labelCls}>Y-Axis data <span className="text-red-500">*</span></label>
                  <select className={inputCls} value={cfg.config?.yAxis||''} onChange={e=>setCfgField('yAxis',e.target.value)}>
                    <option value="">Select…</option>
                    {(cfg.type === 'scatter' ? NUMERIC_METRICS : CHART_AXES).map(a=><option key={a}>{a}</option>)}
                  </select>
                </div>
              </Section>
              <Section title="Styling">
                <div>
                  <label className={labelCls}>Chart color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(cfg.config?.color||'') ? cfg.config.color : '#2563eb'} onChange={e=>setCfgField('color',e.target.value)} className="h-9 w-12 rounded border border-gray-200 cursor-pointer"/>
                    <input className={`${inputCls} flex-1 font-mono text-xs ${cfg.config?.color && !/^#[0-9a-fA-F]{6}$/.test(cfg.config.color) ? 'border-red-400 bg-red-50' : ''}`} value={cfg.config?.color||'#2563eb'} onChange={e=>setCfgField('color',e.target.value)} maxLength={7} placeholder="#2563eb"/>
                  </div>
                  {cfg.config?.color && !/^#[0-9a-fA-F]{6}$/.test(cfg.config.color) && (
                    <p className="text-xs text-red-500 mt-1">Enter valid HEX colour (#rrggbb)</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="showLabel" checked={cfg.config?.showLabel||false} onChange={e=>setCfgField('showLabel',e.target.checked)} className="rounded"/>
                  <label htmlFor="showLabel" className="text-sm text-gray-600">Show data label</label>
                </div>
              </Section>
            </>
          )}

          {/* Pie Chart */}
          {cfg.type === 'pie' && (
            <Section title="Data setting">
              <div>
                <label className={labelCls}>Choose chart data <span className="text-red-500">*</span></label>
                <select className={inputCls} value={cfg.config?.chartData||''} onChange={e=>setCfgField('chartData',e.target.value)}>
                  <option value="">Select…</option>
                  {PIE_DATA_OPTS.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="showLegend" checked={cfg.config?.showLegend||false} onChange={e=>setCfgField('showLegend',e.target.checked)} className="rounded"/>
                <label htmlFor="showLegend" className="text-sm text-gray-600">Show legend</label>
              </div>
            </Section>
          )}

          {/* Table */}
          {cfg.type === 'table' && (
            <>
              <Section title="Data setting">
                <div>
                  <label className={labelCls}>Choose columns <span className="text-red-500">*</span></label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                    {TABLE_COLS.map(col => {
                      const selected = cfg.config?.columns?.includes(col)||false;
                      return (
                        <label key={col} className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0 ${selected?'bg-blue-50':''}`}>
                          <input type="checkbox" checked={selected} onChange={e=>{
                            const cols = cfg.config?.columns||[];
                            setCfgField('columns', e.target.checked ? [...cols,col] : cols.filter(c=>c!==col));
                          }} className="rounded text-blue-600"/>
                          <span className="text-xs text-gray-700">{col}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Sort by</label>
                  <select className={inputCls} value={cfg.config?.sortBy||''} onChange={e=>setCfgField('sortBy',e.target.value)}>
                    <option value="">None</option>
                    {SORT_OPTS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Pagination</label>
                  <select className={inputCls} value={cfg.config?.pagination||''} onChange={e=>setCfgField('pagination',e.target.value)}>
                    <option value="">None</option>
                    {PAGE_SIZES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" id="applyFilter" checked={cfg.config?.applyFilter||false} onChange={e=>setCfgField('applyFilter',e.target.checked)} className="rounded"/>
                    <label htmlFor="applyFilter" className="text-sm text-gray-600">Apply filter</label>
                  </div>
                  {cfg.config?.applyFilter && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Filter conditions</p>
                      <button onClick={()=>{
                        const filters = cfg.config?.filters||[];
                        setCfgField('filters',[...filters,{field:'',op:'=',value:''}]);
                      }} className="text-xs text-blue-600 hover:underline font-medium">+ Add filter</button>
                      {(cfg.config?.filters||[]).map((f,i)=>(
                        <div key={i} className="flex gap-1 mt-2 items-center">
                          <select className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 bg-white" value={f.field} onChange={e=>{
                            const filters=[...cfg.config.filters]; filters[i]={...f,field:e.target.value}; setCfgField('filters',filters);
                          }}><option value="">Field</option>{TABLE_COLS.map(c=><option key={c}>{c}</option>)}</select>
                          <input className="w-20 text-xs border border-gray-200 rounded px-2 py-1" placeholder="Value" value={f.value} onChange={e=>{
                            const filters=[...cfg.config.filters]; filters[i]={...f,value:e.target.value}; setCfgField('filters',filters);
                          }}/>
                          <button onClick={()=>{const filters=cfg.config.filters.filter((_,j)=>j!==i); setCfgField('filters',filters);}} className="text-red-400 hover:text-red-600 text-sm px-1">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
              <Section title="Styling">
                <div>
                  <label className={labelCls}>Font size (12–18)</label>
                  <input type="number" min="12" max="18" className={inputCls} value={cfg.config?.fontSize||14} onChange={e=>setCfgField('fontSize',Math.min(18,Math.max(12,parseInt(e.target.value)||14)))}/>
                </div>
                <div>
                  <label className={labelCls}>Header background</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={cfg.config?.headerBg||'#54bd95'} onChange={e=>setCfgField('headerBg',e.target.value)} className="h-9 w-12 rounded border border-gray-200 cursor-pointer"/>
                    <input className={`${inputCls} flex-1 font-mono text-xs ${cfg.config?.headerBg && !/^#[0-9a-fA-F]{6}$/.test(cfg.config.headerBg) ? 'border-red-400 bg-red-50' : ''}`} value={cfg.config?.headerBg||'#54bd95'} onChange={e=>setCfgField('headerBg',e.target.value)} maxLength={7} placeholder="#54bd95"/>
                    {cfg.config?.headerBg && !/^#[0-9a-fA-F]{6}$/.test(cfg.config.headerBg) && (
                      <p className="text-xs text-red-500 mt-1">Enter valid HEX colour (#rrggbb)</p>
                    )}
                  </div>
                </div>
              </Section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button onClick={() => { onUpdate(cfg); onClose(); }}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirmation ────────────────────────────────────────
function DeleteConfirm({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Remove widget?</h3>
        <p className="text-sm text-gray-400 mb-5">This will remove the widget from the dashboard. You can add it back anytime.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 font-medium">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">Remove</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Configure Page ────────────────────────────────────────
export default function ConfigureDashboard() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const containerRef= useRef(null);

  const [widgets,    setWidgets]    = useState([]);
  const [name,       setName]       = useState('My Dashboard');
  const [analytics,  setAnalytics]  = useState(null);
  const [orders,      setOrders]      = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [gridWidth,  setGridWidth]  = useState(1100);
  const [configWidgetId,  setConfigWidgetId]  = useState(null);
  const [deleteTarget,    setDeleteTarget]    = useState(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Responsive cols
  const getCols = () => {
    if (gridWidth >= 1024) return 12;
    if (gridWidth >= 640)  return 8;
    return 4;
  };
  const cols = getCols();

  useEffect(() => {
    const load = async () => {
      try {
        const [dbRes, anRes, ordRes] = await Promise.all([getDashboard(), getAnalytics('all'), getOrders({ limit: 200 })]);
        const db = dbRes.data.data;
        const templateId = location.state?.template;

        if (templateId && TEMPLATE_WIDGETS[templateId]) {
          setWidgets(TEMPLATE_WIDGETS[templateId].map(w=>({...w})));
          setName(templateId==='blank'?'My Dashboard':`${templateId.charAt(0).toUpperCase()+templateId.slice(1)} Dashboard`);
        } else {
          setWidgets(db.widgets||[]);
          setName(db.name||'My Dashboard');
        }
        setAnalytics(anRes.data.data);
        setOrders(ordRes.data.data || []);
      } catch(e) { console.error(e); }
    };
    load();
  }, [location.state]);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setGridWidth(containerRef.current.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const addWidget = (type) => {
    const def = WIDGET_TYPES.find(t=>t.type===type);
    const id = `w${++widgetCounter}`;
    setWidgets(prev=>[...prev,{
      id, type, title: def.label, description:'',
      config:{
        metric: type==='kpi'?'Customer ID':'',
        aggregation:'Count', format:'Number', decimals:0,
        xAxis:'Product', yAxis:'Total amount',
        color:'#2563eb', showLabel:false,
        chartData:'Status', showLegend:true,
        columns:['Customer name','Product','Total amount','Status'],
        sortBy:'Order date', pagination:'10', fontSize:14, headerBg:'#54bd95', applyFilter:false,
      },
      layout:{ x:0, y:0, w:Math.min(def.defaultW,cols), h:def.defaultH }
    }]);
  };

  const onLayoutChange = (layout) => {
    setWidgets(prev=>prev.map(w=>{
      const l=layout.find(li=>li.i===w.id);
      if (!l) return w;
      return { ...w, layout:{ x:l.x, y:l.y, w:l.w, h:l.h } };
    }));
  };

  const updateWidget = (updated) => {
    setWidgets(prev=>prev.map(w=>w.id===updated.id?updated:w));
  };

  const confirmDelete = () => {
    setWidgets(prev=>prev.filter(w=>w.id!==deleteTarget));
    setDeleteTarget(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDashboard({ name, widgets });
      navigate('/dashboard');
    } catch(e) { alert('Save failed: '+e.message); }
    finally { setSaving(false); }
  };

  const layout = widgets.map(w=>({
    i:w.id, x:w.layout?.x??0, y:w.layout?.y??0,
    w:Math.min(w.layout?.w??4,cols), h:w.layout?.h??4, minW:1, minH:2,
  }));

  return (
    <div className="space-y-4" style={{ fontFamily:"'DM Sans',sans-serif" }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <input value={name} onChange={e=>setName(e.target.value)}
            className="text-xl font-semibold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none px-1 transition-colors min-w-0"/>
          <span className="text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full shrink-0">Editing</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTemplatePicker(v => !v)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 font-medium transition-colors">
            {showTemplatePicker ? 'Close Templates' : 'Templates'}
          </button>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 font-medium transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
            {saving ? 'Saving…' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Template picker dropdown */}
      {showTemplatePicker && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Choose a template — replaces current layout</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { id:'sales',   label:'Sales Overview',      desc:'KPIs, bar chart, pie chart' },
              { id:'orders',  label:'Orders Analytics',    desc:'Counts, breakdown, table' },
              { id:'product', label:'Product Performance', desc:'Revenue chart, trend line' },
              { id:'blank',   label:'Blank',               desc:'Empty canvas' },
            ].map(t => (
              <button key={t.id}
                onClick={() => {
                  if (TEMPLATE_WIDGETS[t.id]) setWidgets(TEMPLATE_WIDGETS[t.id].map(w=>({...w})));
                  setName(t.id==='blank'?'My Dashboard':`${t.id.charAt(0).toUpperCase()+t.id.slice(1)} Dashboard`);
                  setShowTemplatePicker(false);
                }}
                className="text-left p-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group">
                <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700">{t.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 items-start">
        {/* Widget palette */}
        <aside className="w-52 shrink-0 space-y-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Widgets</p>
            <div className="space-y-1.5">
              {WIDGET_TYPES.map(w=>(
                <button key={w.type} onClick={()=>addWidget(w.type)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                  <span className="text-base shrink-0">{w.icon}</span>
                  <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700">{w.label}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-gray-400 px-1 leading-relaxed">
            Drag to rearrange · Resize from corner · Hover to configure
          </p>
        </aside>

        {/* Grid canvas */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 min-h-96" ref={containerRef}>
          {widgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 text-center">
              <div className="w-14 h-14 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center mb-4 text-gray-300">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <p className="text-sm font-medium text-gray-400">Add widgets from the left panel</p>
              <p className="text-xs text-gray-300 mt-1">Drag, resize, and configure them freely</p>
            </div>
          ) : (
            <GridLayout
              layout={layout} cols={cols} rowHeight={60}
              width={Math.max(gridWidth - 32, 200)}
              onLayoutChange={onLayoutChange}
              isDraggable isResizable compactType="vertical" margin={[12,12]}
            >
              {widgets.map(w => (
                <div key={w.id} className="rounded-xl border border-gray-200 bg-gray-50 group" style={{ position:'relative', display:'flex', flexDirection:'column' }}>
                  {/* Drag handle bar — full width, cursor indicates draggable */}
                  <div className="h-7 bg-gray-100 border-b border-gray-200 flex items-center justify-between px-2 shrink-0" style={{ cursor:'grab' }}>
                    <div className="flex items-center gap-1">
                      <div className="grid grid-cols-3 gap-0.5 opacity-40">
                        {[...Array(6)].map((_,i)=><div key={i} className="w-1 h-1 rounded-full bg-gray-500"/>)}
                      </div>
                      <span className="text-[10px] text-gray-500 ml-1.5 font-medium truncate max-w-24">{w.title}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onMouseDown={e=>e.stopPropagation()} onClick={()=>setConfigWidgetId(w.id)}
                        className="p-0.5 hover:text-blue-600 text-gray-400 transition-colors" title="Settings">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                      </button>
                      <button onMouseDown={e=>e.stopPropagation()} onClick={()=>setDeleteTarget(w.id)}
                        className="p-0.5 hover:text-red-500 text-gray-400 transition-colors" title="Delete">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </div>
                  {/* Widget content */}
                  <div style={{ flex:1, overflow:'hidden', minHeight:0 }}>
                    <WidgetPreview widget={w} analytics={analytics} orders={orders}/>
                  </div>
                </div>
              ))}
            </GridLayout>
          )}
        </div>
      </div>

      {/* Config side panel */}
      {(() => {
        const panelWidget = configWidgetId ? widgets.find(w => w.id === configWidgetId) : null;
        return panelWidget ? (
          <ConfigPanel
            key={panelWidget.id}
            widget={panelWidget}
            onUpdate={updateWidget}
            onClose={() => setConfigWidgetId(null)}
          />
        ) : null;
      })()}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteConfirm
          onConfirm={confirmDelete}
          onCancel={()=>setDeleteTarget(null)}
        />
      )}
    </div>
  );
}