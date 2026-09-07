import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Format a number as currency $XX,XXX.XX
 */
function formatCurrency(amount) {
  return (
    '$' +
    Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Format date as DD Mon YYYY, HH:MM
 */
function formatTimestamp(date = new Date()) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${mins}`;
}

/**
 * Executive-Grade Real-Time PDF Inventory Audit & Reorder Report Generator
 * Designed for DukaanSe Kirana Retail Platform
 *
 * @param {Object} options
 * @param {Array} options.products - Array of product objects to audit
 * @param {string} options.activeFilter - Description of current filter scope
 */
export function exportToPdf({ products = [], activeFilter = 'All Products' } = {}) {
  if (!products || products.length === 0) {
    throw new Error('No products available to generate PDF audit report.');
  }

  // 1. Initialize A4 Portrait Document (210 x 297 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const marginX = 14;

  // 2. Compute Executive KPI Summary
  const totalSkus = products.length;
  const totalValuation = products.reduce((sum, p) => {
    const price = Number(p.price) || 0;
    const stock = Number(p.stock) || 0;
    return sum + price * stock;
  }, 0);

  const lowStockCount = products.filter(
    (p) => Number(p.stock) > 0 && Number(p.stock) <= 10
  ).length;

  const outOfStockCount = products.filter(
    (p) => Number(p.stock) === 0
  ).length;

  // 3. Document Header (Dark Navy #0f172a)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 30, 'F');

  // Brand Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text('DukaanSe | Kirana Inventory Audit & Reorder Report', marginX, 13);

  // Subtitle / Scope Metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // #cbd5e1

  const scopeLabel = `Scope: ${String(activeFilter).toUpperCase()}`;
  const timestampLabel = `Generated: ${formatTimestamp()}`;
  doc.text(`${scopeLabel}   •   ${timestampLabel}`, marginX, 21);

  // 4. Executive Summary KPI Strip (Rounded Card at top)
  const cardY = 34;
  const cardHeight = 18;
  const cardWidth = pageWidth - marginX * 2;

  // Card Background & Border
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.roundedRect(marginX, cardY, cardWidth, cardHeight, 2, 2, 'FD');

  // Divide into 4 equal summary columns
  const colWidth = cardWidth / 4;

  const kpis = [
    { label: 'TOTAL SKUs', value: String(totalSkus), color: [15, 23, 42] },
    {
      label: 'TOTAL VALUATION',
      value: formatCurrency(totalValuation),
      color: [15, 23, 42],
    },
    {
      label: 'LOW STOCK ALERTS',
      value: `${lowStockCount} items`,
      color: [217, 119, 6], // Amber #d97706
    },
    {
      label: 'OUT OF STOCK',
      value: `${outOfStockCount} items`,
      color: [225, 29, 72], // Red #e11d48
    },
  ];

  kpis.forEach((kpi, idx) => {
    const colX = marginX + idx * colWidth + colWidth / 2;

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(kpi.label, colX, cardY + 6.5, { align: 'center' });

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, colX, cardY + 13.5, { align: 'center' });

    // Vertical Divider
    if (idx < 3) {
      doc.setDrawColor(226, 232, 240);
      const dividerX = marginX + (idx + 1) * colWidth;
      doc.line(dividerX, cardY + 3, dividerX, cardY + cardHeight - 3);
    }
  });

  // 5. Data Table Preparation
  const tableColumns = [
    { header: 'ID', dataKey: 'id' },
    { header: 'PRODUCT NAME', dataKey: 'title' },
    { header: 'CATEGORY', dataKey: 'category' },
    { header: 'PRICE ($)', dataKey: 'price' },
    { header: 'STOCK LEVEL', dataKey: 'stock' },
    { header: 'SKU', dataKey: 'sku' },
  ];

  const tableRows = products.map((p) => {
    const stock = Number(p.stock) || 0;
    let stockDisplay = `${stock} units`;
    if (stock === 0) {
      stockDisplay = 'OUT OF STOCK';
    } else if (stock <= 10) {
      stockDisplay = `[LOW] ${stock} left`;
    }

    return {
      id: String(p.id),
      title: String(p.title || 'Untitled'),
      category: String(p.category || 'General'),
      price: Number(p.price || 0).toFixed(2),
      stock: stockDisplay,
      rawStock: stock,
      sku: String(p.sku || `SKU-${p.id}`),
    };
  });

  // 6. Render autoTable
  autoTable(doc, {
    startY: 56,
    margin: { left: marginX, right: marginX, bottom: 18 },
    columns: tableColumns,
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Dark Navy #0f172a
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85], // Slate-700
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50 #f8fafc
    },
    columnStyles: {
      id: { halign: 'center', cellWidth: 14 },
      title: { halign: 'left', cellWidth: 'auto' },
      category: { halign: 'left', fontStyle: 'italic', cellWidth: 28 },
      price: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
      stock: { halign: 'center', cellWidth: 32 },
      sku: { halign: 'center', font: 'courier', cellWidth: 30 },
    },
    didParseCell: (data) => {
      // Dynamic Stock Alert Styling in Table
      if (data.section === 'body' && data.column.dataKey === 'stock') {
        const rawStock = data.row.raw?.rawStock ?? 0;
        if (rawStock === 0) {
          data.cell.styles.textColor = [225, 29, 72]; // Bold Red #e11d48
          data.cell.styles.fontStyle = 'bold';
        } else if (rawStock <= 10) {
          data.cell.styles.textColor = [217, 119, 6]; // Bold Amber #d97706
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [51, 65, 85];
        }
      }
    },
  });

  // 7. Multi-page Footer with Exact "Page X of Y" Calculation
  const totalPages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    // Top separator line for footer
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400

    // Left footer
    doc.text(
      'DukaanSe Merchant Operations   •   Confidential & Proprietary',
      marginX,
      pageHeight - 7
    );

    // Right footer (Page X of Y)
    doc.text(
      `Page ${page} of ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 7,
      { align: 'right' }
    );
  }

  // 8. Auto-download PDF File with Scope-Aware Dynamic Name
  const today = new Date().toISOString().slice(0, 10);
  let scopeSlug = 'inventory-report';
  if (activeFilter.toLowerCase().includes('low stock')) {
    scopeSlug = 'low-stock-reorder';
  } else if (activeFilter.toLowerCase().includes('out of stock')) {
    scopeSlug = 'out-of-stock-alert';
  } else if (activeFilter.toLowerCase().includes('category:')) {
    const catName = activeFilter.split(':')[1]?.trim().toLowerCase().replace(/\s+/g, '-') || 'category';
    scopeSlug = `${catName}-inventory`;
  }

  const filename = `dukaanse-${scopeSlug}-${today}.pdf`;
  doc.save(filename);

  return true;
}

export default exportToPdf;
