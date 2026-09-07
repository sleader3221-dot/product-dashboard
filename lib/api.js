const BASE_URL = 'https://dummyjson.com';

const handleResponse = async (res) => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error ${res.status}`);
  }
  return res.json();
};

export const productApi = {
  getAll: async (limit = 100) => {
    const res = await fetch(`${BASE_URL}/products?limit=${limit}`);
    return handleResponse(res);
  },

  search: async (query) => {
    const res = await fetch(
      `${BASE_URL}/products/search?q=${encodeURIComponent(query)}`
    );
    return handleResponse(res);
  },

  getByCategory: async (category) => {
    const res = await fetch(
      `${BASE_URL}/products/category/${encodeURIComponent(category)}`
    );
    return handleResponse(res);
  },

  getCategories: async () => {
    const res = await fetch(`${BASE_URL}/products/categories`);
    return handleResponse(res);
  },

  add: async (productData) => {
    const res = await fetch(`${BASE_URL}/products/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });
    return handleResponse(res);
  },

  update: async (id, productData) => {
    // For seeded server products, call the mock REST endpoint
    if (typeof id === 'number' && id <= 194) {
      const res = await fetch(`${BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      return handleResponse(res);
    }
    // For newly created items in the current session (which DummyJSON doesn't persist on server),
    // simulate network latency and return updated data
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { id, ...productData };
  },

  remove: async (id) => {
    // For seeded server products, call the mock REST endpoint
    if (typeof id === 'number' && id <= 194) {
      const res = await fetch(`${BASE_URL}/products/${id}`, {
        method: 'DELETE',
      });
      return handleResponse(res);
    }
    // For newly created items in the current session, simulate network latency and return success
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { id, isDeleted: true };
  },
};
