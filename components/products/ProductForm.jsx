'use client';

import { useState, useEffect } from 'react';
import { validateProductForm } from '@/utils/validation';

const INITIAL_FORM = {
  title: '',
  category: '',
  price: '',
  stock: '',
  thumbnail: '',
};

export default function ProductForm({ product, categories, onSubmit, onCancel }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const isEditing = Boolean(product);

  // Pre-populate form when editing
  useEffect(() => {
    if (product) {
      setForm({
        title: product.title || '',
        category: product.category || '',
        price: product.price ?? '',
        stock: product.stock ?? '',
        thumbnail: product.thumbnail || '',
      });
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateProductForm(form);

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    const success = await onSubmit({
      title: form.title.trim(),
      category: form.category.trim(),
      price: Number(Number(form.price).toFixed(2)),
      stock: Math.floor(Number(form.stock)),
      thumbnail: form.thumbnail.trim(),
    });
    setSubmitting(false);

    if (success) {
      setForm(INITIAL_FORM);
      setErrors({});
    }
  };

  const inputClass = (field) =>
    `w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500 ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Enter product name"
          className={inputClass('title')}
        />
        {errors.title && (
          <p className="text-red-500 text-xs mt-1">{errors.title}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className={inputClass('category')}
        >
          <option value="">Select a category</option>
          {form.category &&
            !categories.some((cat) => (cat.slug || cat) === form.category) && (
              <option value={form.category}>{form.category}</option>
            )}
          {categories.map((cat) => (
            <option key={cat.slug || cat} value={cat.slug || cat}>
              {cat.name || cat}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="text-red-500 text-xs mt-1">{errors.category}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price ($) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={handleChange}
            placeholder="0.00"
            min="0"
            step="0.01"
            className={inputClass('price')}
          />
          {errors.price && (
            <p className="text-red-500 text-xs mt-1">{errors.price}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stock <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="stock"
            value={form.stock}
            onChange={handleChange}
            placeholder="0"
            min="0"
            step="1"
            className={inputClass('stock')}
          />
          {errors.stock && (
            <p className="text-red-500 text-xs mt-1">{errors.stock}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Image URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          name="thumbnail"
          value={form.thumbnail}
          onChange={handleChange}
          placeholder="https://example.com/image.jpg"
          className={inputClass('thumbnail')}
        />
        {errors.thumbnail && (
          <p className="text-red-500 text-xs mt-1">{errors.thumbnail}</p>
        )}
        {form.thumbnail && !errors.thumbnail && (
          <img
            src={form.thumbnail}
            alt="Preview"
            className="mt-2 h-16 w-16 object-cover rounded-lg border"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
        >
          {submitting ? 'Saving...' : isEditing ? 'Update Product' : 'Add Product'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-gray-300 hover:bg-gray-50 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
