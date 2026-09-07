'use client';

import { useState } from 'react';
import { Pencil, Trash2, Package } from 'lucide-react';
import StatusBadge from '@/components/feedback/StatusBadge';

export default function ProductCard({ product, onEdit, onDelete }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <div className="relative h-44 bg-gray-50 flex items-center justify-center">
        {!imgError && product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.title}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Package className="h-12 w-12 text-gray-300" />
        )}
        <span className="absolute top-2 left-2 bg-white/90 text-gray-600 text-xs px-2 py-0.5 rounded-full capitalize">
          {product.category}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 mb-1">
          {product.title}
        </h3>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <div>
            <p className="text-lg font-bold text-gray-900">
              ${(Number(product.price) || 0).toFixed(2)}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <StockBadge stock={Number(product.stock) || 0} />
              <span className="text-xs text-gray-400">
                {product.stock ?? 0} units
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onEdit(product)}
              className="p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
              aria-label="Edit product"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(product)}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
              aria-label="Delete product"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
