'use client';

import { createContext, useContext, useReducer, useCallback } from 'react';
import { productApi } from '@/lib/api';
import toast from 'react-hot-toast';

// Action types
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_PRODUCTS: 'SET_PRODUCTS',
  ADD_PRODUCT: 'ADD_PRODUCT',
  UPDATE_PRODUCT: 'UPDATE_PRODUCT',
  DELETE_PRODUCT: 'DELETE_PRODUCT',
  SET_SEARCH: 'SET_SEARCH',
  SET_CATEGORY: 'SET_CATEGORY',
};

const initialState = {
  products: [],
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
    case ACTIONS.SET_PRODUCTS:
      return { ...state, loading: false, error: null, products: action.payload };
    case ACTIONS.ADD_PRODUCT:
      return { ...state, products: [action.payload, ...state.products] };
    case ACTIONS.UPDATE_PRODUCT:
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload } : p
        ),
      };
    case ACTIONS.DELETE_PRODUCT:
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.payload),
      };
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

  const fetchProducts = useCallback(async () => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const data = await productApi.getAll();
      dispatch({ type: ACTIONS.SET_PRODUCTS, payload: data.products || [] });
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: err.message || 'Failed to load products' });
      toast.error('Failed to load products');
    }
  }, []);

  const fetchByCategory = useCallback(async (category) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const data = await productApi.getByCategory(category);
      dispatch({ type: ACTIONS.SET_PRODUCTS, payload: data.products || [] });
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: err.message || 'Failed to filter products' });
    }
  }, []);

  const searchProducts = useCallback(async (query) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const data = await productApi.search(query);
      dispatch({ type: ACTIONS.SET_PRODUCTS, payload: data.products || [] });
    } catch (err) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: err.message || 'Failed to search products' });
    }
  }, []);

  const addProduct = useCallback(async (productData) => {
    const toastId = toast.loading('Adding product...');
    try {
      const newProduct = await productApi.add(productData);
      // Optimistic: DummyJSON returns the new product with id
      dispatch({
        type: ACTIONS.ADD_PRODUCT,
        payload: { ...newProduct, id: Date.now() },
      });
      toast.success('Product added successfully!', { id: toastId });
      return true;
    } catch (err) {
      toast.error('Failed to add product', { id: toastId });
      return false;
    }
  }, []);

  const updateProduct = useCallback(async (id, productData) => {
    const toastId = toast.loading('Updating product...');
    try {
      await productApi.update(id, productData);
      dispatch({
        type: ACTIONS.UPDATE_PRODUCT,
        payload: { id, ...productData },
      });
      toast.success('Product updated!', { id: toastId });
      return true;
    } catch (err) {
      toast.error('Failed to update product', { id: toastId });
      return false;
    }
  }, []);

  const deleteProduct = useCallback(async (id) => {
    const toastId = toast.loading('Deleting product...');
    try {
      await productApi.remove(id);
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
        setSearch: (q) =>
          dispatch({ type: ACTIONS.SET_SEARCH, payload: q }),
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
