const API_BASE = '/api';
const UPSTREAM_BASE = 'https://dummyjson.com';

const handleResponse = async (res) => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error ${res.status}`);
  }
  return res.json();
};

export const productApi = {
  getAll: async (limit = 100) => {
    try {
      const res = await fetch(`${API_BASE}/products?limit=${limit}`);
      return await handleResponse(res);
    } catch {
      const res = await fetch(`${UPSTREAM_BASE}/products?limit=${limit}`);
      return await handleResponse(res);
    }
  },

  search: async (query) => {
    try {
      const res = await fetch(
        `${API_BASE}/products?q=${encodeURIComponent(query)}`
      );
      return await handleResponse(res);
    } catch {
      const res = await fetch(
        `${UPSTREAM_BASE}/products/search?q=${encodeURIComponent(query)}`
      );
      return await handleResponse(res);
    }
  },

  getByCategory: async (category) => {
    try {
      const res = await fetch(
        `${API_BASE}/products?category=${encodeURIComponent(category)}`
      );
      return await handleResponse(res);
    } catch {
      const res = await fetch(
        `${UPSTREAM_BASE}/products/category/${encodeURIComponent(category)}`
      );
      return await handleResponse(res);
    }
  },

  getCategories: async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      return await handleResponse(res);
    } catch {
      const res = await fetch(`${UPSTREAM_BASE}/products/categories`);
      return await handleResponse(res);
    }
  },

  add: async (productData) => {
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      return await handleResponse(res);
    } catch {
      const res = await fetch(`${UPSTREAM_BASE}/products/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      return await handleResponse(res);
    }
  },

  update: async (id, productData) => {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      return await handleResponse(res);
    } catch {
      if (typeof id === 'number' && id <= 194) {
        const res = await fetch(`${UPSTREAM_BASE}/products/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData),
        });
        return await handleResponse(res);
      }
      return { id, ...productData };
    }
  },

  remove: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'DELETE',
      });
      return await handleResponse(res);
    } catch {
      if (typeof id === 'number' && id <= 194) {
        const res = await fetch(`${UPSTREAM_BASE}/products/${id}`, {
          method: 'DELETE',
        });
        return await handleResponse(res);
      }
      return { id, isDeleted: true };
    }
  },
};
