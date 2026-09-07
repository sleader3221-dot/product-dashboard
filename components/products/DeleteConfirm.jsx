'use client';

import { AlertTriangle } from 'lucide-react';

export default function DeleteConfirm({ product, onConfirm, onCancel }) {
  if (!product) return null;

  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        <div className="bg-red-100 p-3 rounded-full">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
      </div>
      <h3 className="font-semibold text-gray-800 mb-2">Delete Product</h3>
      <p className="text-gray-500 text-sm mb-1">
        Are you sure you want to delete
      </p>
      <p className="font-medium text-gray-800 mb-4">
        &quot;{product.title}&quot;?
      </p>
      <p className="text-xs text-gray-400 mb-6">
        This action cannot be undone.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 border border-gray-300 hover:bg-gray-50 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
