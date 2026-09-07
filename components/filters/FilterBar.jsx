'use client';

import CategoryFilter from './CategoryFilter';

/**
 * FilterBar Component
 * Provides horizontal scrollable category selection with active indicators,
 * styled to fit DukaanSe kirana retail department navigation.
 */
export default function FilterBar({
  categories = [],
  activeCategory = 'all',
  onSelectCategory,
  className = '',
}) {
  return (
    <div className={`filter-bar-container ${className}`}>
      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={onSelectCategory}
      />
    </div>
  );
}
