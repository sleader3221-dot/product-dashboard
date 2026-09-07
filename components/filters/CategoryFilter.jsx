'use client';

export default function CategoryFilter({
  categories,
  activeCategory,
  onSelectCategory,
}) {
  return (
    <div
      id="category-bar"
      className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none scroll-mt-24"
    >
      <button
        type="button"
        onClick={() => onSelectCategory('all')}
        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
          activeCategory === 'all'
            ? 'bg-blue-600 text-white shadow-xs'
            : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-400'
        }`}
      >
        All
      </button>
      {categories.map((cat) => {
        const slug = cat.slug || cat;
        const name = cat.name || cat;
        return (
          <button
            type="button"
            key={slug}
            onClick={() => onSelectCategory(slug)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize cursor-pointer ${
              activeCategory === slug
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-400'
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
