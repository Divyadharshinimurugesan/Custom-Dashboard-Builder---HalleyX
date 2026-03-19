import { formatOrderId } from './helpers';

// ── CSV Export ────────────────────────────────────────────────
// Exports FILTERED orders — phone as string, IDs safe for Excel
export const exportOrdersCSV = (orders) => {
  if (!orders?.length) { alert('No data to export for the selected period.'); return; }

  const headers = [
    'Order ID', 'First Name', 'Last Name', 'Email', 'Phone',
    'Street', 'City', 'State', 'Postal Code', 'Country',
    'Product', 'Quantity', 'Unit Price', 'Total Amount',
    'Status', 'Created By', 'Date'
  ];

  const rows = orders.map(o => [
    formatOrderId(o._id),             // "#ORD-..." — string, Excel-safe
    o.firstName            || '',
    o.lastName             || '',
    o.email                || '',
    `'${String(o.phone || '')}`,       // leading apostrophe forces Excel text format
    o.streetAddress        || o.address?.street    || '',
    o.city                 || o.address?.city      || '',
    o.state                || o.address?.state     || '',
    o.postalCode           || o.address?.postalCode || '',
    o.country              || o.address?.country   || '',
    o.product              || '',
    o.quantity             || 0,
    Number(o.unitPrice   || 0).toFixed(2),
    Number(o.totalAmount || 0).toFixed(2),
    o.status               || '',
    o.createdBy            || '',
    o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-US', {
      month: '2-digit', day: '2-digit', year: 'numeric'
    }) : '',
  ]);

  // Wrap every cell in double quotes; escape internal quotes
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  const csvContent = [headers, ...rows]
    .map(row => row.map(escape).join(','))
    .join('\r\n'); // CRLF for Excel on Windows

  const bom  = '\uFEFF'; // UTF-8 BOM so Excel handles special chars correctly
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ── PDF Export ─────────────────────────────────────────────────
// All data comes from the same filteredOrders array — matches dashboard exactly
export const exportDashboardPDF = async (kpis, insights = [], filteredOrders = []) => {
  const { jsPDF } = await import('jspdf');
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W    = 210;
  const blue = [37, 99, 235];
  const gray = [107, 114, 128];
  const dark = [17, 24, 39];
  const now  = new Date();

  // Header
  doc.setFillColor(...blue);
  doc.rect(0, 0, W, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Custom Dashboard Builder Report', 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Generated: ${now.toLocaleString()}`, 14, 24);
  doc.text(`Period: ${kpis.rangeLabel || 'All Time'} · ${filteredOrders.length} orders`, 14, 30);

  // KPI row
  let y = 46;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text('Key Metrics', 14, y);
  y += 7;

  const kpiCards = [
    { label: 'Total Revenue',   value: `$${Number(kpis.totalRevenue  || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { label: 'Total Orders',    value: String(kpis.totalOrders  || 0) },
    { label: 'Avg Order Value', value: `$${Number(kpis.avgOrderValue || 0).toFixed(2)}` },
    { label: 'Pending Orders',  value: String(kpis.pendingOrders || 0) },
  ];
  const cardW = (W - 28 - 9) / 4;
  kpiCards.forEach((k, i) => {
    const x = 14 + i * (cardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, 22, 2, 2, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(x, y, cardW, 22, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...blue);
    doc.text(k.value, x + cardW / 2, y + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text(k.label, x + cardW / 2, y + 18, { align: 'center' });
  });
  y += 32;

  // Insights
  if (insights.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...dark);
    doc.text('Insights', 14, y);
    y += 6;
    const colorMap = { positive:[16,185,129], negative:[239,68,68], warning:[245,158,11], info:[59,130,246] };
    insights.forEach(ins => {
      if (y > 255) { doc.addPage(); y = 14; }
      const c = colorMap[ins.type] || colorMap.info;
      doc.setFillColor(...c.map(v => Math.min(v + 185, 255)));
      doc.roundedRect(14, y, W - 28, 11, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...c);
      doc.text(ins.message, 18, y + 7);
      y += 14;
    });
    y += 2;
  }

  // Orders table
  if (filteredOrders.length > 0) {
    if (y > 210) { doc.addPage(); y = 14; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...dark);
    doc.text(`Orders (${filteredOrders.length})`, 14, y);
    y += 6;

    const cols  = ['Order ID', 'Customer', 'Product', 'Total', 'Status', 'Date'];
    const widths = [30, 40, 50, 24, 26, 22];
    doc.setFillColor(...blue);
    doc.rect(14, y, W - 28, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    let xPos = 14;
    cols.forEach((col, i) => { doc.text(col, xPos + 2, y + 5); xPos += widths[i]; });
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    filteredOrders.slice(0, 35).forEach((o, idx) => {
      if (y > 278) { doc.addPage(); y = 14; }
      if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y, W - 28, 6.5, 'F'); }
      doc.setTextColor(...dark);
      const row = [
        formatOrderId(o._id),
        `${o.firstName || ''} ${o.lastName || ''}`.trim().slice(0, 18),
        (o.product || '').slice(0, 22),
        `$${Number(o.totalAmount || 0).toFixed(2)}`,
        o.status || '',
        o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
      ];
      xPos = 14;
      row.forEach((val, i) => { doc.text(String(val), xPos + 2, y + 4.5); xPos += widths[i]; });
      y += 6.5;
    });
    if (filteredOrders.length > 35) {
      doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text(`... and ${filteredOrders.length - 35} more records`, 14, y + 4);
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...gray);
    doc.text(`Custom Dashboard Builder · Page ${i} of ${pageCount}`, W / 2, 290, { align: 'center' });
  }

  doc.save(`dashboard_report_${now.toISOString().slice(0, 10)}.pdf`);
};
