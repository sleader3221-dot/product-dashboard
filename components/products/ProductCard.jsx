'use client';

import { useState } from 'react';
import { Pencil, Trash2, Package, Eye } from 'lucide-react';
import StatusBadge from '@/components/feedback/StatusBadge';

/**
 * Enterprise ProductCard Component
 * Displays retail product details with:
 * - Dynamic stock status badge (In Stock, Low Stock <= 10, Out of Stock = 0)
 * - Quick View trigger on image and title with full keyboard accessibility
 * - Edit and Delete actions with isolated click handlers
 * - Graceful fallback on broken image URLs
 */
export default function ProductCard({
  product,
  onEdit,
  onDelete,
  onQuickView,
}) {
  const [imgError, setImgError] = useState(false);

  const handleKeyQuickView = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onQuickView && onQuickView(product);
    }
  };

  return (
    <div className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col hover:-translate-y-0.5">
      {/* Clickable Image Container for Quick View */}
      <div
        onClick={() => onQuickView && onQuickView(product)}
        onKeyDown={handleKeyQuickView}
        className="relative h-44 bg-gray-50 flex items-center justify-center cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
        role="button"
        tabIndex={0}
        aria-label={`Quick view details for ${product.title}`}
      >
        {!imgError && product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <Package className="h-12 w-12 text-gray-300" />
        )}

        {/* Hover Quick View Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="bg-white/95 text-gray-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
            <Eye className="h-3.5 w-3.5 text-blue-600" />
            Quick View
          </span>
        </div>

        {/* Category Pill */}
        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs text-gray-600 text-xs px-2 py-0.5 rounded-full capitalize shadow-xs font-medium">
          {product.category}
        </span>
      </div>

      {/* Body Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title (Clickable) */}
        <h3
          onClick={() => onQuickView && onQuickView(product)}
          onKeyDown={handleKeyQuickView}
          tabIndex={0}
          role="button"
          aria-label={`View details for ${product.title}`}
          className="font-semibold text-gray-800 text-sm line-clamp-2 mb-1 hover:text-blue-600 cursor-pointer transition-colors focus:outline-none focus:text-blue-600"
        >
          {product.title}
        </h3>

        {/* Price and Stock Status */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <div>
            <p className="text-lg font-bold text-gray-900">
              ${(Number(product.price) || 0).toFixed(2)}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <StatusBadge stock={Number(product.stock) || 0} />
              {Number(product.stock) > 10 && (
                <span className="text-xs text-gray-400">
                  {product.stock} units
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(product);
              }}
              className="p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
              aria-label={`Edit ${product.title}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(product);
              }}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
              aria-label={`Delete ${product.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
