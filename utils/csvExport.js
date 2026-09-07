/**
 * Utility to export an array of product objects to a downloadable CSV file.
 * Formats fields safely with quotes to handle commas and line breaks.
 */
export function exportProductsToCSV(products, filename = 'dukaanse-products.csv') {
  if (!products || products.length === 0) return false;

  const headers = [
    'ID',
    'Title',
    'Category',
    'Price ($)',
    'Stock Qty',
    'Inventory Status',
    'Brand',
    'Rating',
    'Discount (%)',
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = products.map((p) => {
    const stock = Number(p.stock) || 0;
    let status = 'In Stock';
    if (stock === 0) status = 'Out of Stock';
    else if (stock <= 10) status = `Low Stock (${stock} left)`;

    return [
      escapeCSV(p.id),
      escapeCSV(p.title),
      escapeCSV(p.category),
      escapeCSV((Number(p.price) || 0).toFixed(2)),
      escapeCSV(stock),
      escapeCSV(status),
      escapeCSV(p.brand || 'Generic'),
      escapeCSV(p.rating || 'N/A'),
      escapeCSV(p.discountPercentage || 0),
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
