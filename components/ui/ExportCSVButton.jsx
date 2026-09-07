'use client';

import { exportProductsToCSV } from '@/utils/csvExport';
import toast from 'react-hot-toast';

export default function ExportCSVButton({
  products = [],
  kpiFilter = 'all',
  activeCategory = 'all',
}) {
  const handleExport = () => {
    if (!products || products.length === 0) {
      toast.error('No products available to export');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const filename = `dukaanse-inventory-${today}.csv`;

    const success = exportProductsToCSV(products, filename);
    if (success) {
      toast.success(`Exported ${products.length} items to ${filename}`);
    } else {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      title="Download inventory CSV sheet"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg text-xs sm:text-sm font-medium text-gray-700 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
    >
      <span className="text-blue-600 font-bold">⬇</span>
      <span>Export CSV</span>
      {products.length > 0 && (
        <span className="text-[11px] text-gray-400 font-normal">({products.length})</span>
      )}
    </button>
  );
}
