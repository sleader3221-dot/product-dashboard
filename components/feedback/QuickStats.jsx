'use client';

import { Package, Layers, AlertTriangle, XCircle, Check } from 'lucide-react';

export default function QuickStats({
  products = [],
  categories = [],
  activeStockFilter = 'all',
  onSelectStockFilter,
}) {
  const totalProducts = products.length;
  const categoriesCount = categories.length;
  const lowStockCount = products.filter(
    (p) => Number(p.stock) > 0 && Number(p.stock) <= 10
  ).length;
  const outOfStockCount = products.filter(
    (p) => Number(p.stock) === 0
  ).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {/* Total Products (Filter: All) */}
      <button
        onClick={() => onSelectStockFilter && onSelectStockFilter('all')}
        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden active:scale-98 ${
          activeStockFilter === 'all'
            ? 'bg-blue-50/40 border-blue-500 ring-2 ring-blue-400/30 shadow-sm'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package className="h-4 w-4" />
          </div>
          {activeStockFilter === 'all' && (
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-100/70 px-1.5 py-0.5 rounded">
              Active
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-gray-500">Total Products</p>
        <p className="text-lg sm:text-xl font-bold text-gray-900">{totalProducts}</p>
      </button>

      {/* Categories Count */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="h-4 w-4" />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Categories</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900">{categoriesCount}</p>
        </div>
      </div>

      {/* Low Stock Alert Filter Button */}
      <button
        onClick={() => onSelectStockFilter && onSelectStockFilter('low')}
        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden active:scale-98 ${
          activeStockFilter === 'low'
            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400/40 shadow-sm'
            : 'bg-white border-amber-200/80 hover:border-amber-300 hover:bg-amber-50/30'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          {activeStockFilter === 'low' ? (
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Check className="h-3 w-3" /> Filtered
            </span>
          ) : (
            <span className="text-[10px] text-amber-700 font-semibold bg-amber-100/60 px-1.5 py-0.5 rounded">
              Quick Filter
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-amber-800">Low Stock (&le;10)</p>
        <p className="text-lg sm:text-xl font-bold text-amber-900">{lowStockCount}</p>
      </button>

      {/* Out of Stock Filter Button */}
      <button
        onClick={() => onSelectStockFilter && onSelectStockFilter('out')}
        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden active:scale-98 ${
          activeStockFilter === 'out'
            ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-400/40 shadow-sm'
            : 'bg-white border-rose-200/80 hover:border-rose-300 hover:bg-rose-50/30'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <XCircle className="h-4 w-4" />
          </div>
          {activeStockFilter === 'out' ? (
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider bg-rose-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Check className="h-3 w-3" /> Filtered
            </span>
          ) : (
            <span className="text-[10px] text-rose-700 font-semibold bg-rose-100/60 px-1.5 py-0.5 rounded">
              Quick Filter
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-rose-800">Out of Stock</p>
        <p className="text-lg sm:text-xl font-bold text-rose-900">{outOfStockCount}</p>
      </button>
    </div>
  );
}
