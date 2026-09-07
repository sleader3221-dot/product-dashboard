'use client';

import { Download } from 'lucide-react';
import { exportProductsToCSV } from '@/utils/csvExport';
import toast from 'react-hot-toast';

export default function ExportCSVButton({
  products = [],
  activeStockFilter = 'all',
  activeCategory = 'all',
}) {
  const handleExport = () => {
    if (!products || products.length === 0) {
      toast.error('No products available to export');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    let filename = `dukaanse-products-${today}.csv`;
    if (activeStockFilter === 'low') {
      filename = `dukaanse-low-stock-${today}.csv`;
    } else if (activeStockFilter === 'out') {
      filename = `dukaanse-out-of-stock-${today}.csv`;
    } else if (activeCategory !== 'all') {
      filename = `dukaanse-${activeCategory}-${today}.csv`;
    }

    const success = exportProductsToCSV(products, filename);
    if (success) {
      toast.success(`Exported ${products.length} items to ${filename}`);
    } else {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <button
      onClick={handleExport}
      title="Download wholesale re-order sheet"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg text-xs sm:text-sm font-medium text-gray-700 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
    >
      <Download className="h-3.5 w-3.5 text-blue-600" />
      <span>Export CSV</span>
      {activeStockFilter === 'low' && (
        <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-amber-500"></span>
      )}
    </button>
  );
}
