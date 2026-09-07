'use client';

import { ArrowUpDown } from 'lucide-react';

export default function SortDropdown({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative inline-flex items-center">
        <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-8 pr-4 py-1.5 bg-white border border-gray-300 hover:border-gray-400 rounded-lg text-xs sm:text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer shadow-sm"
          aria-label="Sort products"
        >
          <option value="default">Sort: Default</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="stock-asc">Stock: Low to High (Restock)</option>
          <option value="stock-desc">Stock: High to Low</option>
          <option value="name-asc">Name: A to Z</option>
        </select>
      </div>
    </div>
  );
}
