import initialProducts from './seedProducts.json';

// Shared server-side singleton data store
// Initialized with all 194 genuine DummyJSON products
class ProductStore {
  constructor() {
    this.products = [...initialProducts];
    this.maxIdEver = Math.max(
      200,
      ...this.products.map((p) => Number(p.id) || 0)
    );
  }

  getAll({ q, category, limit } = {}) {
    let result = [...this.products];

    // Filter by search query
    if (q && q.trim()) {
      const queryLower = q.trim().toLowerCase();
      result = result.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(queryLower)) ||
          (p.category && p.category.toLowerCase().includes(queryLower)) ||
          (p.description && p.description.toLowerCase().includes(queryLower))
      );
    }

    // Filter by category
    if (category && category !== 'all') {
      const catLower = category.toLowerCase().trim();
      result = result.filter(
        (p) => p.category && p.category.toLowerCase().trim() === catLower
      );
    }

    const total = result.length;
    if (limit && limit > 0) {
      result = result.slice(0, limit);
    }

    return {
      products: result,
      total,
      storeStats: this.getStats(),
    };
  }

  getById(id) {
    const numericId = Number(id);
    return this.products.find((p) => p.id === numericId || p.id === id);
  }

  add(productData) {
    this.maxIdEver += 1;
    const newProduct = {
      ...productData,
      id: this.maxIdEver,
      price: Number(productData.price) || 0,
      stock: Number(productData.stock) ?? 0,
    };
    // Prepend to top of inventory
    this.products = [newProduct, ...this.products];
    return newProduct;
  }

  update(id, productData) {
    const numericId = Number(id);
    const index = this.products.findIndex(
      (p) => p.id === numericId || p.id === id
    );

    if (index === -1) {
      return { id: numericId || id, ...productData };
    }

    const updated = {
      ...this.products[index],
      ...productData,
      price: Number(productData.price ?? this.products[index].price),
      stock: Number(productData.stock ?? this.products[index].stock),
    };

    this.products[index] = updated;
    return updated;
  }

  delete(id) {
    const numericId = Number(id);
    const initialLength = this.products.length;
    this.products = this.products.filter(
      (p) => p.id !== numericId && p.id !== id
    );
    return {
      id: numericId || id,
      isDeleted: this.products.length < initialLength,
    };
  }

  getStats() {
    const total = this.products.length;
    const lowStock = this.products.filter(
      (p) => Number(p.stock) > 0 && Number(p.stock) <= 10
    ).length;
    const outOfStock = this.products.filter(
      (p) => Number(p.stock) === 0
    ).length;

    return {
      totalProducts: total,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
    };
  }
}

// Global singleton to persist across Next.js dev server reloads
const globalStore = globalThis.__DUKAANSE_STORE__ || new ProductStore();
globalThis.__DUKAANSE_STORE__ = globalStore;

export default globalStore;
