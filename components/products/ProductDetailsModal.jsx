'use client';

import { useState, useEffect } from 'react';
import { Star, Package, Pencil, Trash2, RotateCcw, Truck, Tag } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/feedback/StatusBadge';

/**
 * ProductDetailsModal / QuickViewModal
 * Enhanced Quick View modal with:
 * - Multi-image thumbnail gallery (48x48px) with instant preview switcher
 * - Realistic retail copy ("Store Unit Price", subtle "Brand: Generic", "★ 3.1 / 5.0 (Customer Rating)")
 * - Conditioned return policy instead of awkward 1-year warranty on groceries/beauty
 * - Dynamic stock status badge (In Stock, Low Stock <= 10, Out of Stock)
 * - Safe double-confirmation delete trigger
 */
export default function ProductDetailsModal({
  product,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  // Reset active image index whenever the product changes
  useEffect(() => {
    setActiveImageIndex(0);
    setImgError(false);
  }, [product]);

  if (!product) return null;

  // Gather available images with fallback to thumbnail
  const images =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.thumbnail
      ? [product.thumbnail]
      : [];

  const currentImage = images[activeImageIndex] || product.thumbnail;

  const price = Number(product.price) || 0;
  const discount = Number(product.discountPercentage) || 0;
  const originalPrice = discount > 0 ? price / (1 - discount / 100) : null;
  const stock = Number(product.stock) || 0;
  const rating = product.rating ? Number(product.rating).toFixed(1) : '4.5';

  const isConsumable =
    product.category?.toLowerCase() === 'groceries' ||
    product.category?.toLowerCase() === 'beauty' ||
    product.category?.toLowerCase() === 'food';

  const returnPolicyText =
    product.returnPolicy ||
    (isConsumable ? '7-day freshness guarantee' : '30-day store return policy');

  const logisticsText =
    product.shippingInformation || 'Ships overnight or next-day pickup';

  const brandText =
    product.brand && product.brand.trim() !== ''
      ? product.brand
      : 'Generic';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product Quick View">
      <div className="space-y-5">
        {/* Main Image and Gallery Strip */}
        <div className="space-y-3">
          {/* Main Large Preview Image */}
          <div className="relative h-64 sm:h-72 w-full bg-gray-50 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
            {!imgError && currentImage ? (
              <img
                src={currentImage}
                alt={product.title}
                className="h-full w-full object-contain p-2 transition-all duration-200"
                onError={() => setImgError(true)}
              />
            ) : (
              <Package className="h-16 w-16 text-gray-300" />
            )}

            {/* Category Tag */}
            <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs capitalize border border-gray-100 flex items-center gap-1">
              <Tag className="h-3 w-3 text-blue-600" />
              {product.category}
            </span>

            {/* Discount Tag */}
            {discount > 0 && (
              <span className="absolute top-3 right-3 bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-xs">
                {Math.round(discount)}% OFF
              </span>
            )}
          </div>

          {/* Multi-Image Thumbnail Previews Row (48x48px: w-12 h-12) */}
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {images.map((imgUrl, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setActiveImageIndex(idx);
                    setImgError(false);
                  }}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-blue-600 ring-2 ring-blue-100 opacity-100 scale-105'
                      : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`View image ${idx + 1}`}
                >
                  <img
                    src={imgUrl}
                    alt={`${product.title} thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Attributes */}
        <div>
          {/* Brand & SKU Header */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>
              Brand: <span className="text-gray-700 font-semibold">{brandText}</span>
            </span>
            {product.sku && <span className="text-gray-400 font-mono">SKU: {product.sku}</span>}
          </div>

          {/* Title */}
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug mb-1.5">
            {product.title}
          </h2>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mb-3 text-xs sm:text-sm">
            <div className="flex items-center text-amber-500">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-bold ml-1 text-gray-800">{rating}</span>
            </div>
            <span className="text-gray-400">/ 5.0 (Customer Rating)</span>
          </div>

          {/* Price & Stock Row */}
          <div className="flex items-baseline justify-between bg-gray-50 p-3.5 rounded-xl border border-gray-200 mb-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900">
                  ${price.toFixed(2)}
                </span>
                {originalPrice && (
                  <span className="text-sm text-gray-400 line-through">
                    ${originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Store Unit Price</p>
            </div>

            <div className="text-right">
              <StatusBadge stock={stock} />
              <p className="text-xs text-gray-500 mt-1 font-medium">
                {stock} units in inventory
              </p>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Description
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed bg-white border border-gray-100 rounded-lg p-3">
                {product.description}
              </p>
            </div>
          )}

          {/* Retail Logistics Info */}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 bg-gray-50/80 px-2.5 py-1.5 rounded-lg">
              <RotateCcw className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="truncate" title={returnPolicyText}>{returnPolicyText}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50/80 px-2.5 py-1.5 rounded-lg">
              <Truck className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="truncate" title={logisticsText}>{logisticsText}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Double-Confirmation Delete */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(product);
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-xl text-sm transition-colors shadow-xs cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
            Edit Product
          </button>
          <button
            type="button"
            onClick={() => {
              // Open Delete Confirmation modal for double-confirmation
              onClose();
              onDelete(product);
            }}
            className="inline-flex items-center justify-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 font-medium py-2 px-4 rounded-xl text-sm transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}
