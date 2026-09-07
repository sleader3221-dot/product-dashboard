'use client';

import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { productApi } from '@/lib/api';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'dukaanse_store_mutations_v1';

/**
 * Helper to retrieve persisted mutations from localStorage.
 * Ensures created, edited, and deleted products survive page refreshes and serverless resets.
 */
function getStoredMutations() {
  if (typeof window === 'undefined') return { created: [], updated: {}, deleted: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { created: [], updated: {}, deleted: [] };
    const parsed = JSON.parse(raw);
    return {
      created: Array.isArray(parsed.created) ? parsed.created : [],
      updated: parsed.updated && typeof parsed.updated === 'object' ? parsed.updated : {},
      deleted: Array.isArray(parsed.deleted) ? parsed.deleted : [],
    };
  } catch {
    return { created: [], updated: {}, deleted: [] };
  }
}

function saveStoredMutations(mutations) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mutations));
  } catch {
    // Graceful fallback if localStorage is unavailable or quota exceeded
  }
}

/**
 * Merges raw products from API with stored client-side mutations:
 * 1. Excludes deleted product IDs
 * 2. Overwrites fields for edited products
 * 3. Prepends newly created custom products
 */
function applyMutations(rawList, mutations) {
  const deletedSet = new Set((mutations.deleted || []).map((id) => Number(id)));
  const updatedMap = mutations.updated || {};
  const createdList = mutations.created || [];

  // Filter out deleted and merge updates
  const processedRaw = rawList
    .filter((p) => !deletedSet.has(Number(p.id)))
    .map((p) => {
      const update = updatedMap[p.id];
      return update ? { ...p, ...update } : p;
    });

  // Prepend newly created products (also checking deleted set)
  const processedCreated = createdList
    .filter((p) => !deletedSet.has(Number(p.id)))
    .map((p) => {
      const update = updatedMap[p.id];
      return update ? { ...p, ...update } : p;
    });

  return [...processedCreated, ...processedRaw];
}

// Action types
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  INITIALIZE_CATALOG: 'INITIALIZE_CATALOG',
  SET_FILTERED_PRODUCTS: 'SET_FILTERED_PRODUCTS',
  ADD_PRODUCT: 'ADD_PRODUCT',
  UPDATE_PRODUCT: 'UPDATE_PRODUCT',
  DELETE_PRODUCT: 'DELETE_PRODUCT',
  SET_SEARCH: 'SET_SEARCH',
  SET_CATEGORY: 'SET_CATEGORY',
};

const initialState = {
  products: [],
  allProducts: [],
  loading: false,
  error: null,
  searchQuery: '',
  selectedCategory: 'all',
};

function productReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload, error: null };

    case ACTIONS.SET_ERROR:
      return { ...state, loading: false, error: action.payload };

    case ACTIONS.INITIALIZE_CATALOG:
      return {
        ...state,
        loading: false,
        error: null,
        products: action.payload,
        allProducts: action.payload,
      };

    case ACTIONS.SET_FILTERED_PRODUCTS:
      return {
        ...state,
        loading: false,
        error: null,
        products: action.payload,
      };

    case ACTIONS.ADD_PRODUCT: {
      const newProduct = action.payload;
      return {
        ...state,
        products: [newProduct, ...state.products],
        allProducts: [newProduct, ...state.allProducts],
      };
    }

    case ACTIONS.UPDATE_PRODUCT: {
      const updated = action.payload;
      return {
        ...state,
        products: state.products.map((p) =>
          Number(p.id) === Number(updated.id) ? { ...p, ...updated } : p
        ),
        allProducts: state.allProducts.map((p) =>
          Number(p.id) === Number(updated.id) ? { ...p, ...updated } : p
        ),
      };
    }

    case ACTIONS.DELETE_PRODUCT: {
      const targetId = Number(action.payload);
      return {
        ...state,
        products: state.products.filter((p) => Number(p.id) !== targetId),
        allProducts: state.allProducts.filter((p) => Number(p.id) !== targetId),
      };
    }

    case ACTIONS.SET_SEARCH:
      return { ...state, searchQuery: action.payload };

    case ACTIONS.SET_CATEGORY:
      return { ...state, selectedCategory: action.payload };

    default:
      return state;
  }
}

const ProductContext = createContext(null);

export function ProductProvider({ children }) {
  const [state, dispatch] = useReducer(productReducer, initialState);

  // Initial catalog fetch with mutation sync
  const fetchProducts = useCallback(async () => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const data = await productApi.getAll();
      const mutations = getStoredMutations();
      const merged = applyMutations(data.products || [], mutations);
      dispatch({ type: ACTIONS.INITIALIZE_CATALOG, payload: merged });
    } catch (err) {
      dispatch({
        type: ACTIONS.SET_ERROR,
        payload: err.message || 'Failed to load products',
      });
      toast.error('Failed to load products');
    }
  }, []);

  // Filter products by category with guaranteed client persistence
  const fetchByCategory = useCallback(
    async (category) => {
      dispatch({ type: ACTIONS.SET_CATEGORY, payload: category });
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });

      // Fast-path: Filter directly from living catalog in memory
      if (state.allProducts && state.allProducts.length > 0) {
        const filtered =
          category === 'all'
            ? state.allProducts
            : state.allProducts.filter(
                (p) =>
                  p.category &&
                  p.category.toLowerCase().trim() ===
                    category.toLowerCase().trim()
              );
        dispatch({ type: ACTIONS.SET_FILTERED_PRODUCTS, payload: filtered });
        return;
      }

      // Fallback: Fetch from API proxy if living store not yet loaded
      try {
        const data = await productApi.getByCategory(category);
        const mutations = getStoredMutations();
        const merged = applyMutations(data.products || [], mutations);
        dispatch({ type: ACTIONS.SET_FILTERED_PRODUCTS, payload: merged });
      } catch (err) {
        dispatch({
          type: ACTIONS.SET_ERROR,
          payload: err.message || 'Failed to filter products',
        });
      }
    },
    [state.allProducts]
  );

  // Search products by name, category, or brand with guaranteed client persistence
  const searchProducts = useCallback(
    async (query) => {
      dispatch({ type: ACTIONS.SET_SEARCH, payload: query });
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });

      if (!query || !query.trim()) {
        dispatch({
          type: ACTIONS.SET_FILTERED_PRODUCTS,
          payload: state.allProducts,
        });
        return;
      }

      const q = query.trim().toLowerCase();

      // Fast-path: Search directly within living catalog
      if (state.allProducts && state.allProducts.length > 0) {
        const filtered = state.allProducts.filter(
          (p) =>
            (p.title && p.title.toLowerCase().includes(q)) ||
            (p.category && p.category.toLowerCase().includes(q)) ||
            (p.brand && p.brand.toLowerCase().includes(q)) ||
            (p.description && p.description.toLowerCase().includes(q))
        );
        dispatch({ type: ACTIONS.SET_FILTERED_PRODUCTS, payload: filtered });
        return;
      }

      // Fallback: Query API proxy
      try {
        const data = await productApi.search(query);
        const mutations = getStoredMutations();
        const merged = applyMutations(data.products || [], mutations);
        dispatch({ type: ACTIONS.SET_FILTERED_PRODUCTS, payload: merged });
      } catch (err) {
        dispatch({
          type: ACTIONS.SET_ERROR,
          payload: err.message || 'Failed to search products',
        });
      }
    },
    [state.allProducts]
  );

  // Add Product with optimistic UI update and mutation persistence
  const addProduct = useCallback(
    async (productData) => {
      const toastId = toast.loading('Adding product...');
      try {
        let newProduct;
        try {
          newProduct = await productApi.add(productData);
        } catch {
          // Fallback if API is offline
          const maxId = state.allProducts.reduce(
            (max, p) => (typeof p.id === 'number' && p.id > max ? p.id : max),
            200
          );
          newProduct = { ...productData, id: maxId + 1 };
        }

        if (!newProduct || !newProduct.id) {
          const maxId = state.allProducts.reduce(
            (max, p) => (typeof p.id === 'number' && p.id > max ? p.id : max),
            200
          );
          newProduct = { ...productData, id: maxId + 1 };
        }

        // Store mutation in localStorage
        const mutations = getStoredMutations();
        mutations.created = [
          newProduct,
          ...mutations.created.filter((p) => p.id !== newProduct.id),
        ];
        saveStoredMutations(mutations);

        dispatch({ type: ACTIONS.ADD_PRODUCT, payload: newProduct });
        toast.success('Product added successfully!', { id: toastId });
        return true;
      } catch (err) {
        toast.error('Failed to add product', { id: toastId });
        return false;
      }
    },
    [state.allProducts]
  );

  // Update Product with optimistic UI update and mutation persistence
  const updateProduct = useCallback(async (id, productData) => {
    const toastId = toast.loading('Updating product...');
    try {
      let updated;
      try {
        updated = await productApi.update(id, productData);
      } catch {
        updated = { id, ...productData };
      }

      const mergedProduct = { id, ...(updated || productData) };

      // Store mutation in localStorage
      const mutations = getStoredMutations();
      mutations.updated[id] = mergedProduct;
      saveStoredMutations(mutations);

      dispatch({
        type: ACTIONS.UPDATE_PRODUCT,
        payload: mergedProduct,
      });
      toast.success('Product updated!', { id: toastId });
      return true;
    } catch (err) {
      toast.error('Failed to update product', { id: toastId });
      return false;
    }
  }, []);

  // Delete Product with optimistic UI update and mutation persistence
  const deleteProduct = useCallback(async (id) => {
    const toastId = toast.loading('Deleting product...');
    try {
      try {
        await productApi.remove(id);
      } catch {
        // Proceed with optimistic deletion
      }

      // Store mutation in localStorage
      const mutations = getStoredMutations();
      const numId = Number(id);
      if (!mutations.deleted.some((d) => Number(d) === numId)) {
        mutations.deleted.push(numId);
      }
      mutations.created = mutations.created.filter(
        (p) => Number(p.id) !== numId
      );
      delete mutations.updated[id];
      saveStoredMutations(mutations);

      dispatch({ type: ACTIONS.DELETE_PRODUCT, payload: id });
      toast.success('Product deleted', { id: toastId });
      return true;
    } catch (err) {
      toast.error('Failed to delete product', { id: toastId });
      return false;
    }
  }, []);

  return (
    <ProductContext.Provider
      value={{
        ...state,
        fetchProducts,
        fetchByCategory,
        searchProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        setSearch: (q) => dispatch({ type: ACTIONS.SET_SEARCH, payload: q }),
        setCategory: (c) =>
          dispatch({ type: ACTIONS.SET_CATEGORY, payload: c }),
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export const useProductContext = () => {
  const ctx = useContext(ProductContext);
  if (!ctx)
    throw new Error('useProductContext must be used inside ProductProvider');
  return ctx;
};
