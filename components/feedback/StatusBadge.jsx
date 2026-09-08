'use client';

export default function StatusBadge({ stock }) {
  const qty = Number(stock) || 0;

  if (qty === 0)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
        Out of stock
      </span>
    );

  if (qty <= 10)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        Low stock ({qty} left)
      </span>
    );

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
      In stock
    </span>
  );
}
