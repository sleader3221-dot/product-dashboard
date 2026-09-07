/**
 * Utility to export an array of product objects to a downloadable CSV file.
 * Formats fields safely with RFC 4180 quotes to handle commas, quotes, and line breaks.
 * Headers: ID, Title, Category, Price, Stock, Rating, SKU
 * Filename format: dukaanse-inventory-YYYY-MM-DD.csv
 */
export function exportProductsToCSV(products, customFilename) {
  if (!products || products.length === 0) return false;

  const today = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `dukaanse-inventory-${today}.csv`;

  const headers = ['ID', 'Title', 'Category', 'Price', 'Stock', 'Rating', 'SKU'];

  const rows = products.map((p) => {
    const title = p.title || '';
    const category = p.category || '';
    const price = (Number(p.price) || 0).toFixed(2);
    const stock = Number(p.stock) || 0;
    const rating = p.rating ? Number(p.rating).toFixed(1) : 'N/A';
    const sku = p.sku || `SKU-${p.id}`;

    return [
      p.id,
      `"${String(title).replace(/"/g, '""')}"`,
      `"${String(category).replace(/"/g, '""')}"`,
      price,
      stock,
      rating,
      `"${String(sku).replace(/"/g, '""')}"`,
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
