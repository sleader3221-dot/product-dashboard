'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, PackageCheck } from 'lucide-react';

// Voice prepares, a tap confirms. Shows exactly what will change before
// any bulk or destructive action runs.
export default function ConfirmSheet({ request, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const rows = request.rows || [];
  const Icon = request.danger ? AlertTriangle : PackageCheck;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="voice-confirm-title"
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="px-5 pt-5 pb-3 flex items-start gap-3">
          <div
            className={`shrink-0 h-9 w-9 rounded-lg flex items-center justify-center ${
              request.danger ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="voice-confirm-title" className="text-base font-semibold text-gray-900">
              {request.title}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Requested by voice. Check the list, then confirm.
            </p>
          </div>
        </div>

        <ul className="px-5 overflow-y-auto divide-y divide-gray-100 border-y border-gray-100">
          {rows.map((r) => (
            <li key={r.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-800 truncate">{r.title}</span>
              <span className="shrink-0 tabular-nums text-gray-500">
                {r.beforeText}
                <span className="mx-1.5 text-gray-300" aria-hidden="true">›</span>
                <span className={request.danger ? 'text-rose-600 font-medium' : 'text-gray-900 font-semibold'}>
                  {r.afterText}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="p-4 flex gap-2 justify-end" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              request.danger
                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {busy ? 'Working…' : `${request.confirmLabel} ${rows.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}
