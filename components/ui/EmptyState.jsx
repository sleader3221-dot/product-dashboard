'use client';

import { RotateCcw, Search, PackageCheck } from 'lucide-react';

/**
 * Contextual EmptyState Component
 * Displays intelligent, user-friendly feedback based on active filter combination:
 * - Query active: offers search clear
 * - Category + Stock active: explains no low-stock in that category and offers toggling
 * - Out of stock: celebratory in-stock notification
 * - Never shows "Add your first product" when store catalog is healthy
 */
export default function EmptyState({
  query = '',
  category = 'all',
  kpiFilter = 'all',
  onResetFilters,
  onClearSearch,
  onClearCategory,
  onClearKpiFilter,
}) {
  const isSearchActive = Boolean(query && query.trim());
  const isCategoryActive = category && category !== 'all';
  const isLowStock = kpiFilter === 'low_stock' || kpiFilter === 'low';
  const isOutOfStock = kpiFilter === 'out_of_stock' || kpiFilter === 'out';

  // 1. Celebratory Out of Stock Empty State
  if (isOutOfStock) {
    return (
      <div className="text-center py-16 px-4 bg-white rounded-2xl border border-emerald-100 shadow-xs my-6">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
          🎉
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          All Items Are In Stock!
        </h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          Your inventory is in great shape. No products are currently out of stock.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-200 cursor-pointer active:scale-95"
          >
            <PackageCheck className="h-4 w-4" />
            View All Products
          </button>
        )}
      </div>
    );
  }

  // 2. Low Stock filter inside a specific Category
  if (isLowStock && isCategoryActive) {
    return (
      <div className="text-center py-16 px-4 bg-white rounded-2xl border border-gray-200 shadow-xs my-6">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          📦
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          No Low Stock Products in <span className="capitalize text-blue-600">&quot;{category}&quot;</span>
        </h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          All items in this department are well stocked (&gt;10 units).
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onClearKpiFilter && (
            <button
              type="button"
              onClick={onClearKpiFilter}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              View All {category} Products
            </button>
          )}
          {onClearCategory && (
            <button
              type="button"
              onClick={onClearCategory}
              className="inline-flex items-center gap-1.5 border border-amber-300 bg-amber-50/50 hover:bg-amber-100 text-amber-900 text-xs sm:text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              View All Low Stock Items
            </button>
          )}
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-900 underline px-2 py-2 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. Search Query No Results
  if (isSearchActive) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-gray-200 shadow-xs my-6">
        <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
          <Search className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          No results for &quot;{query}&quot;
        </h3>
        <p className="text-gray-500 text-sm max-w-sm mb-6">
          We couldn&apos;t find any product matching your search. Check for typos or try broader keywords.
        </p>
        {onClearSearch && (
          <button
            type="button"
            onClick={onClearSearch}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Clear Search
          </button>
        )}
      </div>
    );
  }

  // 4. General Active Filters Empty State
  if (isCategoryActive || isLowStock) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-gray-200 shadow-xs my-6">
        <p className="text-4xl mb-3">📦</p>
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          No products match your active filters
        </h3>
        <p className="text-gray-500 text-sm max-w-sm mb-6">
          Try adjusting your department or inventory filter criteria.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            Reset All Filters
          </button>
        )}
      </div>
    );
  }

  // 5. Fallback for completely empty catalog
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-200 shadow-xs my-6">
      <p className="text-5xl mb-4">📦</p>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        No products in catalog
      </h3>
      <p className="text-gray-400 text-sm mb-4">
        Add your first product to get started with DukaanSe.
      </p>
    </div>
  );
}
