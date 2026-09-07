'use client';

import { Plus, Search } from 'lucide-react';

export default function Navbar({ searchInput, onSearchChange, onAddClick }) {
  return (
    <header className="bg-white border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900 shrink-0">
          🛒 Product Dashboard
        </h1>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchInput}
            onChange={onSearchChange}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={onAddClick}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Product</span>
        </button>
      </div>
    </header>
  );
}
