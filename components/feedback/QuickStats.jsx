'use client';

import { Package, Layers, AlertTriangle, XCircle, Check } from 'lucide-react';

export default function QuickStats({
  products = [],
  categories = [],
  kpiFilter = 'all',
  activeCategory = 'all',
  activeStockFilter, // Backwards-compatible prop
  onSelectKpiFilter,
  onSelectStockFilter, // Backwards-compatible prop
}) {
  // Normalize filter value across both prop signatures
  const currentFilter = kpiFilter || activeStockFilter || 'all';

  const handleSelect = (filterKey) => {
    if (onSelectKpiFilter) {
      onSelectKpiFilter(filterKey);
    } else if (onSelectStockFilter) {
      const mapped =
        filterKey === 'low_stock'
          ? 'low'
          : filterKey === 'out_of_stock'
          ? 'out'
          : filterKey;
      onSelectStockFilter(mapped);
    }
  };

  const totalProducts = products.length;
  const categoriesCount = categories.length;
  const lowStockCount = products.filter(
    (p) => Number(p.stock) > 0 && Number(p.stock) <= 10
  ).length;
  const outOfStockCount = products.filter(
    (p) => Number(p.stock) === 0
  ).length;

  const isAllActive = currentFilter === 'all';
  const isCategoriesActive =
    currentFilter === 'categories' || (activeCategory && activeCategory !== 'all');
  const isLowStockActive =
    currentFilter === 'low_stock' || currentFilter === 'low';
  const isOutOfStockActive =
    currentFilter === 'out_of_stock' || currentFilter === 'out';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {/* 1. Total Products Filter Button */}
      <button
        type="button"
        onClick={() => handleSelect('all')}
        aria-pressed={isAllActive}
        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden active:scale-98 ${
          isAllActive
            ? 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-500 shadow-sm'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package className="h-4 w-4" />
          </div>
          {isAllActive && (
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-100/90 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Check className="h-3 w-3" /> ACTIVE
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-gray-500">Total Products</p>
        <p className="text-lg sm:text-xl font-bold text-gray-900">{totalProducts}</p>
      </button>

      {/* 2. Categories KPI Filter Button (Interactive category switching) */}
      <button
        type="button"
        onClick={() => handleSelect('categories')}
        aria-pressed={isCategoriesActive}
        title={
          isCategoriesActive && activeCategory !== 'all'
            ? `Current category: ${activeCategory} (click to switch next)`
            : 'Filter by category'
        }
        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden active:scale-98 ${
          isCategoriesActive
            ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500 shadow-sm'
            : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/20'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          {isCategoriesActive ? (
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Check className="h-3 w-3" /> ACTIVE
            </span>
          ) : (
            <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">
              Filter
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-gray-500 truncate">
          {isCategoriesActive && activeCategory !== 'all' ? (
            <span>
              Cat: <span className="text-indigo-600 font-semibold capitalize">{activeCategory}</span>
            </span>
          ) : (
            'Categories'
          )}
        </p>
        <p className="text-lg sm:text-xl font-bold text-gray-900">{categoriesCount}</p>
      </button>

      {/* 3. Low Stock Alert Filter Button */}
      <button
        type="button"
        onClick={() => handleSelect('low_stock')}
        aria-pressed={isLowStockActive}
        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden active:scale-98 ${
          isLowStockActive
            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500 shadow-sm'
            : 'bg-white border-amber-200/80 hover:border-amber-300 hover:bg-amber-50/30'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          {isLowStockActive ? (
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Check className="h-3 w-3" /> ACTIVE
            </span>
          ) : (
            <span className="text-[10px] text-amber-700 font-semibold bg-amber-100/60 px-1.5 py-0.5 rounded">
              Filter
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-amber-800">Low Stock (&le;10)</p>
        <p className="text-lg sm:text-xl font-bold text-amber-900">{lowStockCount}</p>
      </button>

      {/* 4. Out of Stock Filter Button */}
      <button
        type="button"
        onClick={() => handleSelect('out_of_stock')}
        aria-pressed={isOutOfStockActive}
        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden active:scale-98 ${
          isOutOfStockActive
            ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500 shadow-sm'
            : 'bg-white border-rose-200/80 hover:border-rose-300 hover:bg-rose-50/30'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <XCircle className="h-4 w-4" />
          </div>
          {isOutOfStockActive ? (
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider bg-rose-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Check className="h-3 w-3" /> ACTIVE
            </span>
          ) : (
            <span className="text-[10px] text-rose-700 font-semibold bg-rose-100/60 px-1.5 py-0.5 rounded">
              Filter
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-rose-800">Out of Stock</p>
        <p className="text-lg sm:text-xl font-bold text-rose-900">{outOfStockCount}</p>
      </button>
    </div>
  );
}
