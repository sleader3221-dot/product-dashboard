'use client';

import { Package, Layers, AlertTriangle, XCircle } from 'lucide-react';

export default function QuickStats({ products = [], categories = [] }) {
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
      {/* Total Products */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Total Products</p>
          <p className="text-lg font-bold text-gray-900">{totalProducts}</p>
        </div>
      </div>

      {/* Active Categories */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">Categories</p>
          <p className="text-lg font-bold text-gray-900">{categoriesCount}</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-amber-800">Low Stock (&le;10)</p>
          <p className="text-lg font-bold text-amber-900">{lowStockCount}</p>
        </div>
      </div>

      {/* Out of Stock Alert */}
      <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/30 shadow-sm flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
          <XCircle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-rose-800">Out of Stock</p>
          <p className="text-lg font-bold text-rose-900">{outOfStockCount}</p>
        </div>
      </div>
    </div>
  );
}
