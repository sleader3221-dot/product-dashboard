'use client';

import ProductCard from './ProductCard';

export default function ProductGrid({
  products,
  onEdit,
  onDelete,
  onQuickView,
  selectedIds = new Set(),
  onToggleSelect,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product, idx) => (
        <ProductCard
          key={`prod-${product.id ?? idx}`}
          product={product}
          isSelected={selectedIds.has(product.id)}
          onToggleSelect={onToggleSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onQuickView={onQuickView}
        />
      ))}
    </div>
  );
}
