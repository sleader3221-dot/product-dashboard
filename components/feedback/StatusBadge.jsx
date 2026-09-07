export default function StatusBadge({ stock }) {
  if (stock === 0)
    return (
      <span className="text-xs font-medium px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
        Out of stock
      </span>
    );
  if (stock <= 10)
    return (
      <span className="text-xs font-medium px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
        Low stock
      </span>
    );
  return (
    <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
      In stock
    </span>
  );
}
