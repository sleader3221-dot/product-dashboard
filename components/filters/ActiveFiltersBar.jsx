'use client';

import { X, RotateCcw } from 'lucide-react';

export default function ActiveFiltersBar({
  searchInput = '',
  activeCategory = 'all',
  activeStockFilter = 'all',
  resultCount = 0,
  onClearSearch,
  onClearCategory,
  onClearStockFilter,
  onResetAll,
}) {
  const isSearchActive = Boolean(searchInput && searchInput.trim());
  const isCategoryActive = activeCategory !== 'all';
  const isStockActive = activeStockFilter !== 'all';

  const hasAnyFilter = isSearchActive || isCategoryActive || isStockActive;
  if (!hasAnyFilter) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 mb-5 text-xs sm:text-sm animate-fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-gray-700">Active Filters:</span>

        {/* Search Query Pill */}
        {isSearchActive && (
          <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-blue-200 text-blue-800 font-medium shadow-2xs">
            Query: &quot;{searchInput}&quot;
            <button
              onClick={onClearSearch}
              className="hover:text-red-600 transition-colors p-0.5"
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
              onClick={onClearCategory}
              className="hover:text-red-600 transition-colors p-0.5"
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
              activeStockFilter === 'low'
                ? 'border-amber-300 text-amber-900 bg-amber-50/50'
                : 'border-rose-300 text-rose-900 bg-rose-50/50'
            }`}
          >
            {activeStockFilter === 'low' ? 'Low Stock (≤10)' : 'Out of Stock'}
            <button
              onClick={onClearStockFilter}
              className="hover:text-red-600 transition-colors p-0.5"
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
        onClick={onResetAll}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline transition-all cursor-pointer ml-auto"
      >
        <RotateCcw className="h-3 w-3" />
        Reset Filters
      </button>
    </div>
  );
}
