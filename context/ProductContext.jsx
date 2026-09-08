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
    const created = Array.isArray(parsed.created) ? parsed.created : [];
    const createdIds = new Set(created.map((p) => Number(p.id)));
    // Clean deleted: any actively created product must NEVER be considered deleted
    const deleted = (Array.isArray(parsed.deleted) ? parsed.deleted : []).filter(
      (id) => !createdIds.has(Number(id))
    );
    const updated = parsed.updated && typeof parsed.updated === 'object' ? parsed.updated : {};
    return { created, updated, deleted };
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
 * 4. Deduplicates strictly by numeric ID to prevent React duplicate key collisions on refresh
 */
function applyMutations(rawList, mutations) {
  const createdList = Array.isArray(mutations?.created) ? mutations.created : [];
  const updatedMap =
    mutations?.updated && typeof mutations.updated === 'object'
      ? mutations.updated
      : {};
  const deletedSet = new Set((mutations?.deleted || []).map((id) => Number(id)));

  // Active custom products must NEVER be treated as deleted
  const createdIdSet = new Set(createdList.map((p) => Number(p.id)));
  for (const id of createdIdSet) {
    deletedSet.delete(id);
  }

  // 1. Process custom created products (applying any stored updates)
  const processedCreated = createdList.map((p) => {
    const update = updatedMap[p.id] || updatedMap[Number(p.id)];
    return update ? { ...p, ...update } : p;
  });

  // 2. Process raw products from server API:
  // Exclude deleted items and items that are already in processedCreated
  const processedRaw = (rawList || [])
    .filter(
      (p) => !deletedSet.has(Number(p.id)) && !createdIdSet.has(Number(p.id))
    )
    .map((p) => {
      const update = updatedMap[p.id] || updatedMap[Number(p.id)];
      return update ? { ...p, ...update } : p;
    });

  // Deduplicate strictly by numeric ID: created items take precedence at top
  const seenIds = new Set();
  const merged = [];

  for (const item of processedCreated) {
    const numId = Number(item.id);
    if (!isNaN(numId) && !seenIds.has(numId)) {
      seenIds.add(numId);
      merged.push(item);
    }
  }

  for (const item of processedRaw) {
    const numId = Number(item.id);
    if (!isNaN(numId) && !seenIds.has(numId)) {
      seenIds.add(numId);
      merged.push(item);
    }
  }

  return merged;
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

    case ACTIONS.INITIALIZE_CATALOG: {
      const seen = new Set();
      const unique = [];
      for (const item of (action.payload || [])) {
        const id = Number(item.id);
        if (!seen.has(id)) {
          seen.add(id);
          unique.push(item);
        }
      }
      return {
        ...state,
        loading: false,
        error: null,
        products: unique,
        allProducts: unique,
      };
    }

    case ACTIONS.SET_FILTERED_PRODUCTS: {
      const seen = new Set();
      const unique = [];
      for (const item of (action.payload || [])) {
        const id = Number(item.id);
        if (!seen.has(id)) {
          seen.add(id);
          unique.push(item);
        }
      }
      return {
        ...state,
        loading: false,
        error: null,
        products: unique,
      };
    }

    case ACTIONS.ADD_PRODUCT: {
      const newProduct = action.payload;
      const cleanProducts = state.products.filter(
        (p) => Number(p.id) !== Number(newProduct.id)
      );
      const cleanAll = state.allProducts.filter(
        (p) => Number(p.id) !== Number(newProduct.id)
      );
      return {
        ...state,
        products: [newProduct, ...cleanProducts],
        allProducts: [newProduct, ...cleanAll],
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
      // Fallback: load catalog from stored mutations if server temporarily unreachable
      const mutations = getStoredMutations();
      const merged = applyMutations([], mutations);
      if (merged.length > 0) {
        dispatch({ type: ACTIONS.INITIALIZE_CATALOG, payload: merged });
      } else {
        dispatch({
          type: ACTIONS.SET_ERROR,
          payload: err.message || 'Failed to load products',
        });
      }
      toast.error('Failed to load products from server');
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
          const mutations = getStoredMutations();
          const allKnownIds = [
            ...state.allProducts.map((p) => Number(p.id) || 0),
            ...(mutations.created || []).map((p) => Number(p.id) || 0),
          ];
          const maxId = Math.max(200, ...allKnownIds);
          newProduct = { ...productData, id: maxId + 1 };
        }

        if (!newProduct || !newProduct.id) {
          const mutations = getStoredMutations();
          const allKnownIds = [
            ...state.allProducts.map((p) => Number(p.id) || 0),
            ...(mutations.created || []).map((p) => Number(p.id) || 0),
          ];
          const maxId = Math.max(200, ...allKnownIds);
          newProduct = { ...productData, id: maxId + 1 };
        }

        // Store mutation in localStorage
        const mutations = getStoredMutations();
        const numId = Number(newProduct.id);

        // Ensure this new ID is cleared from deleted list in case it was previously deleted
        mutations.deleted = (mutations.deleted || []).filter(
          (d) => Number(d) !== numId
        );

        // Prepend new product to created list
        mutations.created = [
          newProduct,
          ...(mutations.created || []).filter((p) => Number(p.id) !== numId),
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

      const numId = Number(id);
      const mergedProduct = { id: numId || id, ...(updated || productData) };

      // Store mutation in localStorage
      const mutations = getStoredMutations();
      mutations.updated[id] = mergedProduct;
      mutations.updated[numId] = mergedProduct;
      // Also update within created list if it is a custom created product
      mutations.created = (mutations.created || []).map((p) =>
        Number(p.id) === numId ? { ...p, ...mergedProduct } : p
      );
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
      mutations.created = (mutations.created || []).filter(
        (p) => Number(p.id) !== numId
      );
      delete mutations.updated[id];
      delete mutations.updated[numId];
      saveStoredMutations(mutations);

      dispatch({ type: ACTIONS.DELETE_PRODUCT, payload: numId });
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
