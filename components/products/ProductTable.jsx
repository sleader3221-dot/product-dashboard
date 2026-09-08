'use client';

import { useState } from 'react';
import { Eye, Pencil, Trash2, MessageCircle, Copy, Package, Check } from 'lucide-react';
import StatusBadge from '@/components/feedback/StatusBadge';
import toast from 'react-hot-toast';

/**
 * Generate WhatsApp reorder URL for low-stock products
 */
function getWhatsAppUrl(product) {
  const stock = Number(product.stock) || 0;
  const sku = product.sku || `SKU-${product.id}`;
  const text = encodeURIComponent(
    `🛒 DukaanSe Reorder Request\n` +
    `Product: ${product.title}\n` +
    `SKU: ${sku}\n` +
    `Current Stock: ${stock} units\n` +
    `Category: ${product.category || 'General'}\n` +
    `Requested Qty: 50 units`
  );
  return `https://wa.me/?text=${text}`;
}

/**
 * Stateful table thumbnail with fallback icon on broken URLs
 */
function TableThumbnail({ src, alt, onClick }) {
  const [error, setError] = useState(false);
  return (
    <div
      className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden shrink-0 cursor-pointer flex items-center justify-center hover:opacity-80 transition-opacity"
      onClick={onClick}
    >
      {!error && src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <Package className="h-4 w-4 text-gray-300" />
      )}
    </div>
  );
}

/**
 * ProductTable Component — High-Density Table View
 * Enterprise-grade responsive table with:
 * - Checkbox bulk selection
 * - SKU clipboard copy
 * - WhatsApp reorder for low-stock items
 * - Full action buttons (Quick View, Edit, Delete)
 * - Dynamic stock status badges
 */
export default function ProductTable({
  products,
  onEdit,
  onDelete,
  onQuickView,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAllOnPage,
  allOnPageSelected = false,
}) {
  const [copiedSku, setCopiedSku] = useState(null);

  const handleCopySku = async (sku, productId) => {
    const skuText = sku || `SKU-${productId}`;
    try {
      await navigator.clipboard.writeText(skuText);
      setCopiedSku(productId);
      toast.success(`SKU "${skuText}" copied to clipboard`);
      setTimeout(() => setCopiedSku(null), 2000);
    } catch {
      toast.error('Failed to copy SKU');
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
      <table className="w-full text-left border-collapse min-w-[720px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {/* Select All Checkbox */}
            <th className="w-10 px-3 py-3">
              <input
                type="checkbox"
                checked={allOnPageSelected && products.length > 0}
                onChange={onSelectAllOnPage}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                aria-label="Select all products on page"
              />
            </th>
            <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
            <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
            <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
            <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Price</th>
            <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Stock</th>
            <th className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product, idx) => {
            const stock = Number(product.stock) || 0;
            const isSelected = selectedIds.has(product.id);
            const sku = product.sku || `SKU-${product.id}`;
            const isLowStock = stock > 0 && stock <= 10;
            const brandText = product.brand && product.brand.trim() !== '' ? product.brand : 'Generic';

            return (
              <tr
                key={`tbl-prod-${product.id ?? idx}`}
                className={`transition-colors hover:bg-slate-50/80 ${
                  isSelected ? 'bg-blue-50/50' : ''
                }`}
              >
                {/* Checkbox */}
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect && onToggleSelect(product.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    aria-label={`Select ${product.title}`}
                  />
                </td>

                {/* Product (Thumbnail + Title + Brand) */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <TableThumbnail
                      src={product.thumbnail}
                      alt={product.title}
                      onClick={() => onQuickView && onQuickView(product)}
                    />
                    <div className="min-w-0">
                      <p
                        className="text-sm font-semibold text-gray-800 truncate max-w-[200px] hover:text-blue-600 cursor-pointer transition-colors"
                        onClick={() => onQuickView && onQuickView(product)}
                        title={product.title}
                      >
                        {product.title}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {brandText}
                      </p>
                    </div>
                  </div>
                </td>

                {/* SKU with Copy */}
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => handleCopySku(product.sku, product.id)}
                    className="inline-flex items-center gap-1 font-mono text-xs text-gray-600 hover:text-blue-600 transition-colors cursor-pointer group"
                    title="Click to copy SKU"
                  >
                    <span>{sku}</span>
                    {copiedSku === product.id ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                </td>

                {/* Category */}
                <td className="px-3 py-2.5">
                  <span className="text-xs text-gray-600 capitalize bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                    {product.category}
                  </span>
                </td>

                {/* Price */}
                <td className="px-3 py-2.5 text-right">
                  <span className="text-sm font-bold text-gray-900">
                    ${(Number(product.price) || 0).toFixed(2)}
                  </span>
                </td>

                {/* Stock Badge */}
                <td className="px-3 py-2.5 text-center">
                  <StatusBadge stock={stock} />
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    {/* Quick View */}
                    <button
                      type="button"
                      onClick={() => onQuickView && onQuickView(product)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                      aria-label={`Quick view ${product.title}`}
                      title="Quick View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => onEdit(product)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                      aria-label={`Edit ${product.title}`}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => onDelete(product)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      aria-label={`Delete ${product.title}`}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {/* WhatsApp Reorder (only for low stock ≤ 10) */}
                    {isLowStock && (
                      <a
                        href={getWhatsAppUrl(product)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                        aria-label={`Reorder ${product.title} via WhatsApp`}
                        title="Reorder via WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
