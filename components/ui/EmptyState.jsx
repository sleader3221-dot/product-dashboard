export default function EmptyState({ query }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-5xl mb-4">📦</p>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        {query ? `No results for "${query}"` : 'No products found'}
      </h3>
      <p className="text-gray-400 text-sm">
        {query
          ? 'Try a different search term.'
          : 'Add your first product to get started.'}
      </p>
    </div>
  );
}
