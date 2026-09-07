'use client';

import { X, RotateCcw } from 'lucide-react';

export default function ActiveFiltersBar({
  searchInput = '',
  activeCategory = 'all',
  kpiFilter = 'all',
  activeStockFilter, // Backwards compatible
  resultCount = 0,
  onClearSearch,
  onClearCategory,
  onClearKpiFilter,
  onClearStockFilter,
  onResetAll,
}) {
  const isSearchActive = Boolean(searchInput && searchInput.trim());
  const isCategoryActive = activeCategory !== 'all';
  const effectiveKpi = kpiFilter !== 'all' ? kpiFilter : activeStockFilter || 'all';
  const isStockActive =
    effectiveKpi === 'low_stock' ||
    effectiveKpi === 'low' ||
    effectiveKpi === 'out_of_stock' ||
    effectiveKpi === 'out';

  const hasAnyFilter = isSearchActive || isCategoryActive || isStockActive;
  if (!hasAnyFilter) return null;

  const isLowStock = effectiveKpi === 'low_stock' || effectiveKpi === 'low';
  const clearKpiHandler = onClearKpiFilter || onClearStockFilter;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 mb-5 text-xs sm:text-sm animate-fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-gray-700">Active Filters:</span>

        {/* Search Query Pill */}
        {isSearchActive && (
          <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-blue-200 text-blue-800 font-medium shadow-2xs">
            Query: &quot;{searchInput}&quot;
            <button
              type="button"
              onClick={onClearSearch}
              className="hover:text-red-600 transition-colors p-0.5 cursor-pointer"
              aria-label="Remove search filter"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}

        {/* Category Pill */}
        {isCategoryActive && (
          <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-blue-200 text-blue-800 font-medium capitalize shadow-2xs">
            Category: {activeCategory}
            <button
              type="button"
              onClick={onClearCategory}
              className="hover:text-red-600 transition-colors p-0.5 cursor-pointer"
              aria-label="Remove category filter"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}

        {/* Stock Filter Pill */}
        {isStockActive && (
          <span
            className={`inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border font-medium shadow-2xs ${
              isLowStock
                ? 'border-amber-300 text-amber-900 bg-amber-50/50'
                : 'border-rose-300 text-rose-900 bg-rose-50/50'
            }`}
          >
            {isLowStock ? 'Low Stock (≤10)' : 'Out of Stock'}
            <button
              type="button"
              onClick={clearKpiHandler}
              className="hover:text-red-600 transition-colors p-0.5 cursor-pointer"
              aria-label="Remove stock filter"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}

        {/* Matching count indicator */}
        <span className="text-gray-500 text-xs ml-1 font-medium">
          ({resultCount} matching)
        </span>
      </div>

      {/* Reset All Filters Button */}
      <button
        type="button"
        onClick={onResetAll}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline transition-all cursor-pointer ml-auto"
      >
        <RotateCcw className="h-3 w-3" />
        Reset Filters
      </button>
    </div>
  );
}
