'use client';

import { Plus, Search, X } from 'lucide-react';

export default function Navbar({
  searchInput,
  onSearchChange,
  onClearSearch,
  onAddClick,
}) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm shadow-blue-200">
            🛒
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight">
                DukaanSe
              </h1>
              <span className="hidden sm:inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Kirana Admin
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium hidden md:block">
              Inventory & Product Management
            </p>
          </div>
        </div>

        {/* Global Search Bar with Quick Clear (X) Button */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products by name..."
            value={searchInput}
            onChange={onSearchChange}
            className="w-full pl-9 pr-9 py-2 bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
          />
          {searchInput && (
            <button
              onClick={onClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-all"
              aria-label="Clear search input"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Add Product CTA */}
        <button
          onClick={onAddClick}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm shadow-blue-200 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Product</span>
        </button>
      </div>
    </header>
  );
}
