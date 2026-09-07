const API_BASE = '/api';

const handleResponse = async (res) => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error ${res.status}`);
  }
  return res.json();
};

export const productApi = {
  getAll: async (limit = 100) => {
    const res = await fetch(`${API_BASE}/products?limit=${limit}`);
    return handleResponse(res);
  },

  search: async (query) => {
    const res = await fetch(
      `${API_BASE}/products?q=${encodeURIComponent(query)}`
    );
    return handleResponse(res);
  },

  getByCategory: async (category) => {
    const res = await fetch(
      `${API_BASE}/products?category=${encodeURIComponent(category)}`
    );
    return handleResponse(res);
  },

  getCategories: async () => {
    const res = await fetch(`${API_BASE}/categories`);
    return handleResponse(res);
  },

  add: async (productData) => {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    return handleResponse(res);
  },

  update: async (id, productData) => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    return handleResponse(res);
  },

  remove: async (id) => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },
};
