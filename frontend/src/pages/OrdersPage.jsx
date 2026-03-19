import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getOrders, createOrder, updateOrder, deleteOrder } from '../services/api';
import OrderModal from '../components/OrderModal';
import UndoToast  from '../components/UndoToast';
import { exportOrdersCSV } from '../utils/export';
import { STATUS_COLORS, formatOrderId } from '../utils/helpers';

const FILTER_STATUSES = ['', 'Pending', 'In progress', 'Completed'];

const SORT_COLS = [
  { key: 'firstName',   label: 'Customer' },
  { key: 'product',     label: 'Product'  },
  { key: 'totalAmount', label: 'Total'    },
  { key: 'status',      label: 'Status'   },
  { key: 'createdAt',   label: 'Date'     },
];

// ── Text highlight helper ──────────────────────────────────────
// Wraps matched substring in a <mark> span
function Highlight({ text = '', query = '' }) {
  if (!query.trim() || !text) return <>{text}</>;
  const parts = String(text).split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
          : part
      )}
    </>
  );
}

function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <span className="ml-1 text-gray-300 text-[10px]">↕</span>;
  return <span className="ml-1 text-blue-500 text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

export default function OrdersPage() {
  // ── Server-side state (pagination, sort, status filter) ────
  const [serverOrders, setServerOrders] = useState([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [pages,        setPages]        = useState(1);
  const [status,       setStatus]       = useState('');
  const [sortKey,      setSortKey]      = useState('createdAt');
  const [sortDir,      setSortDir]      = useState('desc');
  const [serverLoading, setServerLoading] = useState(true);
  const [allOrders,    setAllOrders]    = useState([]);

  // ── Client-side instant search ──────────────────────────────
  const [search, setSearch] = useState('');

  // ── UI state ────────────────────────────────────────────────
  const [modal,    setModal]    = useState(null);
  const [undoData, setUndoData] = useState(null);
  const [undoToast,setUndoToast]= useState(null);

  // ── Load paginated orders (no search param — done client-side) ──
  const load = useCallback(async () => {
    setServerLoading(true);
    try {
      // Fetch a larger set so client-side search works across multiple pages
      // Use limit=1000 so search sees all orders, paginate client-side
      const res = await getOrders({ status, sort: sortKey, order: sortDir, limit: 1000 });
      setServerOrders(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (e) { console.error(e); }
    finally { setServerLoading(false); }
  }, [status, sortKey, sortDir]);

  useEffect(() => { load(); }, [load]);

  // Load all orders for stats
  useEffect(() => {
    getOrders({ limit: 2000 }).then(r => setAllOrders(r.data.data || [])).catch(() => {});
  }, [serverOrders]);

  // ── Client-side instant search + filter ──────────────────────
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return serverOrders;
    return serverOrders.filter(o => {
      const name    = `${o.firstName || ''} ${o.lastName || ''}`.toLowerCase();
      const product = (o.product || '').toLowerCase();
      const email   = (o.email   || '').toLowerCase();
      const phone   = (o.phone   || '').toLowerCase();
      return name.includes(q) || product.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [serverOrders, search]);

  // Client-side pagination on top of filtered results
  const PAGE_SIZE = 10;
  const clientPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safePage    = Math.min(page, clientPages);
  const pageOrders  = useMemo(
    () => filteredOrders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredOrders, safePage]
  );

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); }, [search, status]);

  const handleSort = useCallback((col) => {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(col); setSortDir('asc'); }
    setPage(1);
  }, [sortKey]);

  const handleSave = useCallback(async (data) => {
    if (modal === 'create') await createOrder(data);
    else await updateOrder(modal._id, data);
    setModal(null);
    load();
  }, [modal, load]);

  const handleDelete = useCallback((order) => {
    if (undoData?.timer) clearTimeout(undoData.timer);
    setServerOrders(prev => prev.filter(o => o._id !== order._id));
    setTotal(t => t - 1);
    const timer = setTimeout(async () => {
      try { await deleteOrder(order._id); } catch {}
      setUndoData(null);
      setUndoToast(null);
      load();
    }, 5000);
    setUndoData({ order, timer });
    setUndoToast({ message: `Deleted — ${order.firstName} ${order.lastName}` });
  }, [undoData, load]);

  const handleUndo = useCallback(() => {
    if (!undoData) return;
    clearTimeout(undoData.timer);
    setUndoData(null);
    setUndoToast(null);
    load();
  }, [undoData, load]);

  // Stats from allOrders
  const stats = useMemo(() => ({
    total:     allOrders.length,
    pending:   allOrders.filter(o => o.status === 'Pending').length,
    completed: allOrders.filter(o => o.status === 'Completed').length,
    revenue:   allOrders.reduce((s, o) => s + (o.totalAmount || 0), 0),
  }), [allOrders]);

  const q = search.trim(); // for highlight

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Customer Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {search
              ? `${filteredOrders.length} result${filteredOrders.length !== 1 ? 's' : ''} for "${search}"`
              : total > 0 ? `${total} order${total !== 1 ? 's' : ''}` : 'No orders yet'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allOrders.length > 0 && (
            <button onClick={() => exportOrdersCSV(allOrders)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 font-medium transition-colors bg-white">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Export CSV
            </button>
          )}
          <button onClick={() => setModal('create')}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Create Order
          </button>
        </div>
      </div>

      {/* Stats */}
      {allOrders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Orders',  value: stats.total },
            { label: 'Pending',       value: stats.pending },
            { label: 'Completed',     value: stats.completed },
            { label: 'Total Revenue', value: `$${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className="text-lg font-semibold text-gray-900 font-mono">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + Status filter — always visible once data exists */}
      {allOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-3 items-center">
          {/* Instant search */}
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="13" height="13"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search name, email, product, phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-300 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
          {/* Status filter (server-side) */}
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-600 hover:border-gray-300">
            {FILTER_STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
          </select>
          {(search || status) && (
            <button onClick={() => { setSearch(''); setStatus(''); setPage(1); }}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors whitespace-nowrap">
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Empty state — no orders at all */}
        {!serverLoading && allOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="1.5">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <path d="M9 12h6M9 16h4"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">No orders yet</p>
            <p className="text-xs text-gray-400 mb-5">Click 'Create Order' to get started.</p>
            <button onClick={() => setModal('create')}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Create Order
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {SORT_COLS.map(({ key, label }) => (
                      <th key={key} onClick={() => handleSort(key)}
                        className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 whitespace-nowrap select-none transition-colors">
                        {label}<SortIcon col={key} sortKey={sortKey} sortDir={sortDir}/>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {serverLoading ? (
                    <tr><td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"/>
                        <span className="text-xs text-gray-400">Loading…</span>
                      </div>
                    </td></tr>
                  ) : filteredOrders.length === 0 ? (
                    // "No results found" empty state for search
                    <tr><td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth="1.5">
                          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                        </svg>
                        <p className="text-sm font-medium text-gray-400">No results found</p>
                        <p className="text-xs text-gray-300">
                          No orders match {search ? `"${search}"` : 'your filters'}
                        </p>
                        <button onClick={() => { setSearch(''); setStatus(''); }}
                          className="mt-1 text-xs text-blue-500 hover:underline">Clear filters</button>
                      </div>
                    </td></tr>
                  ) : pageOrders.map(o => {
                    const sc = STATUS_COLORS[o.status] || '#9ca3af';
                    return (
                      <tr key={o._id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-[13px] text-gray-800">
                            <Highlight text={`${o.firstName} ${o.lastName}`} query={q}/>
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            <Highlight text={o.email} query={q}/>
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-[13px] text-gray-700">
                            <Highlight text={o.product} query={q}/>
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">Qty: {o.quantity}</p>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[13px] font-semibold text-gray-800">
                          ${(o.totalAmount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${sc}20`, color: sc }}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-400">
                          {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setModal(o)}
                              className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              Edit
                            </button>
                            <button onClick={() => handleDelete(o)}
                              className="px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {clientPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40">
                <span className="text-xs text-gray-400">
                  {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length}
                  {search && <span className="text-blue-500"> (filtered)</span>}
                </span>
                <div className="flex items-center gap-1">
                  <button disabled={safePage === 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white font-medium text-gray-600 transition-colors">
                    ← Prev
                  </button>
                  {Array.from({ length: Math.min(clientPages, 5) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${safePage === p ? 'bg-blue-600 text-white' : 'hover:bg-white text-gray-600 border border-gray-200'}`}>
                      {p}
                    </button>
                  ))}
                  <button disabled={safePage === clientPages} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white font-medium text-gray-600 transition-colors">
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {undoToast && <UndoToast message={undoToast.message} onUndo={handleUndo} onDismiss={() => setUndoToast(null)}/>}

      {modal && (
        <OrderModal
          initial={modal === 'create' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
