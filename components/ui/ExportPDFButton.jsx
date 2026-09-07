'use client';

import { FileText } from 'lucide-react';
import { exportToPdf } from '@/utils/generatePdf';
import toast from 'react-hot-toast';

/**
 * ExportPDFButton Component
 * Triggers the executive-grade PDF Inventory Audit & Reorder Report download.
 * Computes human-readable scope label from current filters and displays product count.
 */
export default function ExportPDFButton({
  products = [],
  kpiFilter = 'all',
  activeCategory = 'all',
  searchInput = '',
}) {
  const handleExport = () => {
    if (!products || products.length === 0) {
      toast.error('No products available to generate PDF audit report');
      return;
    }

    let activeFilterLabel = 'Full Catalog Audit';
    if (kpiFilter === 'low_stock' || kpiFilter === 'low') {
      activeFilterLabel = 'Low Stock Reorder Sheet (<=10)';
    } else if (kpiFilter === 'out_of_stock' || kpiFilter === 'out') {
      activeFilterLabel = 'Out of Stock Alert Sheet (0 units)';
    } else if (activeCategory && activeCategory !== 'all') {
      activeFilterLabel = `Category: ${activeCategory.toUpperCase()}`;
    } else if (searchInput && searchInput.trim()) {
      activeFilterLabel = `Search: "${searchInput.trim()}"`;
    }

    toast.success('Generating inventory audit report...');

    try {
      exportToPdf({
        products,
        activeFilter: activeFilterLabel,
      });
    } catch (err) {
      toast.error(err.message || 'Failed to generate PDF report');
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      title="Download Executive PDF Inventory Audit & Reorder Report"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs sm:text-sm font-medium transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
    >
      <FileText className="h-3.5 w-3.5 text-blue-400" />
      <span>Export PDF</span>
      {products.length > 0 && (
        <span className="text-[11px] text-slate-300 font-normal">
          ({products.length})
        </span>
      )}
    </button>
  );
}
