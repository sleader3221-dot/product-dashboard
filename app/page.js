'use client';

import { useState, useEffect } from 'react';
import { useProductContext } from '@/context/ProductContext';
import { useCategories } from '@/hooks/useCategories';
import { useDebounce } from '@/hooks/useDebounce';
import Navbar from '@/components/layout/Navbar';
import CategoryFilter from '@/components/filters/CategoryFilter';
import ProductGrid from '@/components/products/ProductGrid';
import ProductForm from '@/components/products/ProductForm';
import DeleteConfirm from '@/components/products/DeleteConfirm';
import Modal from '@/components/ui/Modal';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';

export default function Dashboard() {
  const {
    products,
    loading,
    error,
    fetchProducts,
    fetchByCategory,
    searchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useProductContext();

  const { categories } = useCategories();

  const [searchInput, setSearchInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);

  const debouncedSearch = useDebounce(searchInput, 400);

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // React to debounced search
  useEffect(() => {
    if (debouncedSearch.trim()) {
      searchProducts(debouncedSearch.trim());
    } else if (activeCategory === 'all') {
      fetchProducts();
    } else {
      fetchByCategory(activeCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (val.trim() && activeCategory !== 'all') {
      setActiveCategory('all');
    }
  };

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setSearchInput('');
    if (category === 'all') {
      fetchProducts();
    } else {
      fetchByCategory(category);
    }
  };

  const handleRetry = () => {
    if (debouncedSearch.trim()) {
      searchProducts(debouncedSearch.trim());
    } else if (activeCategory === 'all') {
      fetchProducts();
    } else {
      fetchByCategory(activeCategory);
    }
  };

  const handleAddProduct = async (data) => {
    const success = await addProduct(data);
    if (success) setIsAddModalOpen(false);
    return success;
  };

  const handleUpdateProduct = async (data) => {
    const success = await updateProduct(editingProduct.id, data);
    if (success) setEditingProduct(null);
    return success;
  };

  const handleConfirmDelete = async () => {
    const success = await deleteProduct(deletingProduct.id);
    if (success) setDeletingProduct(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar with responsive search & Add button */}
      <Navbar
        searchInput={searchInput}
        onSearchChange={handleSearchChange}
        onAddClick={() => setIsAddModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Category Filter tabs */}
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={handleCategoryChange}
        />

        {/* Product count indicator */}
        {!loading && !error && (
          <p className="text-sm text-gray-400 mb-4">
            {products.length} product{products.length !== 1 ? 's' : ''} found
            {searchInput
              ? ` for "${searchInput}"`
              : activeCategory !== 'all'
              ? ` in "${activeCategory}"`
              : ''}
          </p>
        )}

        {/* Dynamic UI Content States */}
        {loading && <LoadingSkeleton count={8} />}

        {error && !loading && (
          <ErrorState message={error} onRetry={handleRetry} />
        )}

        {!loading && !error && products.length === 0 && (
          <EmptyState query={searchInput} />
        )}

        {!loading && !error && products.length > 0 && (
          <ProductGrid
            products={products}
            onEdit={setEditingProduct}
            onDelete={setDeletingProduct}
          />
        )}
      </main>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Product"
      >
        <ProductForm
          categories={categories}
          onSubmit={handleAddProduct}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        title="Edit Product"
      >
        <ProductForm
          product={editingProduct}
          categories={categories}
          onSubmit={handleUpdateProduct}
          onCancel={() => setEditingProduct(null)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        title="Confirm Delete"
      >
        <DeleteConfirm
          product={deletingProduct}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingProduct(null)}
        />
      </Modal>
    </div>
  );
}
