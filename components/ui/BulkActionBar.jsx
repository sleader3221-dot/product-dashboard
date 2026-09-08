'use client';

import { CheckSquare, Package, Trash2, X } from 'lucide-react';

/**
 * BulkActionBar Component
 * Fixed bottom-center floating pill that appears when items are selected.
 * Provides Restock +10, Bulk Delete, and Deselect All actions.
 */
export default function BulkActionBar({
  selectedCount = 0,
  onRestock,
  onBulkDelete,
  onDeselectAll,
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom duration-300 max-w-[calc(100vw-24px)]">
      <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900 text-white rounded-2xl shadow-2xl px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-700 w-max">
        {/* Selection Count Badge */}
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <CheckSquare className="h-4 w-4 text-blue-400" />
          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center">
            {selectedCount}
          </span>
          <span className="hidden sm:inline text-slate-300 text-xs font-medium">selected</span>
        </span>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-600" />

        {/* Restock +10 Button */}
        <button
          type="button"
          onClick={onRestock}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer active:scale-95"
          title="Add 10 units to each selected product"
        >
          <Package className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Restock +10</span>
          <span className="sm:hidden">+10</span>
        </button>

        {/* Bulk Delete Button */}
        <button
          type="button"
          onClick={onBulkDelete}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer active:scale-95"
          title="Delete all selected products"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Delete</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-600" />

        {/* Deselect All Button */}
        <button
          type="button"
          onClick={onDeselectAll}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          aria-label="Deselect all"
          title="Clear selection"
        >
          <X className="h-4 w-4 text-slate-400 hover:text-white" />
        </button>
      </div>
    </div>
  );
}
