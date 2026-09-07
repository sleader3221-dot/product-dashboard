'use client';

import ProductCard from './ProductCard';

export default function ProductGrid({
  products,
  onEdit,
  onDelete,
  onQuickView,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
          onQuickView={onQuickView}
        />
      ))}
    </div>
  );
}
