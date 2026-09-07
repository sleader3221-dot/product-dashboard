'use client';

import { useState, useEffect, useMemo } from 'react';
import { useProductContext } from '@/context/ProductContext';
import { useCategories } from '@/hooks/useCategories';
import { useDebounce } from '@/hooks/useDebounce';
import Navbar from '@/components/layout/Navbar';
import FilterBar from '@/components/filters/FilterBar';
import SortDropdown from '@/components/filters/SortDropdown';
import ActiveFiltersBar from '@/components/filters/ActiveFiltersBar';
import QuickStats from '@/components/feedback/QuickStats';
import ExportCSVButton from '@/components/ui/ExportCSVButton';
import Pagination from '@/components/ui/Pagination';
import ProductGrid from '@/components/products/ProductGrid';
import ProductModal from '@/components/products/ProductModal';
import DeleteConfirm from '@/components/products/DeleteConfirm';
import ProductDetailsModal from '@/components/products/ProductDetailsModal';
import Modal from '@/components/ui/Modal';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';

export default function Dashboard() {
  const {
    products,
    allProducts,
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

  // Filter & Search states
  const [searchInput, setSearchInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeStockFilter, setActiveStockFilter] = useState('all'); // 'all' | 'low' | 'out'
  const [sortBy, setSortBy] = useState('default');

  // Pagination state (16 products per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 16;

  // Modal dialog states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  const debouncedSearch = useDebounce(searchInput, 300);

  // Initial products fetch on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // React to debounced search input with automatic pagination reset
  useEffect(() => {
    setCurrentPage(1);
    if (debouncedSearch.trim()) {
      searchProducts(debouncedSearch.trim());
    } else if (activeCategory === 'all') {
      fetchProducts();
    } else {
      fetchByCategory(activeCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Search input change handler with instant pagination reset
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    setCurrentPage(1);
    if (val.trim() && activeCategory !== 'all') {
      setActiveCategory('all');
    }
  };

  // Clear search input (X button) with instant pagination reset
  const handleClearSearch = () => {
    setSearchInput('');
    setCurrentPage(1);
    if (activeCategory === 'all') {
      fetchProducts();
    } else {
      fetchByCategory(activeCategory);
    }
  };

  // Category switch handler with instant pagination reset
  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setSearchInput('');
    setCurrentPage(1);
    if (category === 'all') {
      fetchProducts();
    } else {
      fetchByCategory(category);
    }
  };

  const handleClearCategory = () => {
    handleCategoryChange('all');
  };

  // Clickable KPI Card filter handler with instant pagination reset
  const handleSelectStockFilter = (filterKey) => {
    setCurrentPage(1);
    // Clicking 'Total Products' resets stock filter to 'all'
    if (filterKey === 'all') {
      setActiveStockFilter('all');
    } else if (activeStockFilter === filterKey) {
      // Toggle back to 'all' if clicking already active filter
      setActiveStockFilter('all');
    } else {
      setActiveStockFilter(filterKey);
    }
  };

  const handleClearStockFilter = () => {
    setActiveStockFilter('all');
    setCurrentPage(1);
  };

  // Global reset for all active filters
  const handleResetAllFilters = () => {
    setSearchInput('');
    setActiveCategory('all');
    setActiveStockFilter('all');
    setSortBy('default');
    setCurrentPage(1);
    fetchProducts();
  };

  // Retry query on error state
  const handleRetry = () => {
    if (debouncedSearch.trim()) {
      searchProducts(debouncedSearch.trim());
    } else if (activeCategory === 'all') {
      fetchProducts();
    } else {
      fetchByCategory(activeCategory);
    }
  };

  // CRUD handlers
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

  // Smooth scroll to top on pagination change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 250, behavior: 'smooth' });
    }
  };

  // 1. Apply KPI Stock Filter ('all' | 'low' | 'out')
  const stockFilteredProducts = useMemo(() => {
    if (activeStockFilter === 'low') {
      return products.filter(
        (p) => Number(p.stock) > 0 && Number(p.stock) <= 10
      );
    }
    if (activeStockFilter === 'out') {
      return products.filter((p) => Number(p.stock) === 0);
    }
    return products;
  }, [products, activeStockFilter]);

  // 2. Apply Operational Sorting (Price, Stock Replenishment, Name)
  const sortedProducts = useMemo(() => {
    const list = [...stockFilteredProducts];
    switch (sortBy) {
      case 'price-asc':
        return list.sort((a, b) => Number(a.price) - Number(b.price));
      case 'price-desc':
        return list.sort((a, b) => Number(b.price) - Number(a.price));
      case 'stock-asc':
        return list.sort((a, b) => Number(a.stock) - Number(b.stock));
      case 'stock-desc':
        return list.sort((a, b) => Number(b.stock) - Number(a.stock));
      case 'name-asc':
        return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      default:
        return list;
    }
  }, [stockFilteredProducts, sortBy]);

  // Total pages calculation and auto-clamping
  const totalPages = Math.ceil(sortedProducts.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // 3. Apply Client-Side Pagination (16 products per page)
  const paginatedProducts = useMemo(() => {
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    return sortedProducts.slice(startIndex, startIndex + pageSize);
  }, [sortedProducts, currentPage, totalPages, pageSize]);

  return (
    <div className="min-h-screen bg-gray-50/70">
      {/* Header Navbar with search input, clear button, and Add Product button */}
      <Navbar
        searchInput={searchInput}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        onAddClick={() => setIsAddModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Executive Kirana Inventory Overview with Clickable KPI Quick-Filters */}
        <QuickStats
          products={allProducts && allProducts.length > 0 ? allProducts : products}
          categories={categories}
          activeStockFilter={activeStockFilter}
          onSelectStockFilter={handleSelectStockFilter}
        />

        {/* Category Filter Tabs via FilterBar */}
        <FilterBar
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={handleCategoryChange}
        />

        {/* Active Filters Bar (Shown only when any filter is active) */}
        <ActiveFiltersBar
          searchInput={searchInput}
          activeCategory={activeCategory}
          activeStockFilter={activeStockFilter}
          resultCount={sortedProducts.length}
          onClearSearch={handleClearSearch}
          onClearCategory={handleClearCategory}
          onClearStockFilter={handleClearStockFilter}
          onResetAll={handleResetAllFilters}
        />

        {/* Toolbar: Count indicator, CSV Export, and Sort Dropdown */}
        {!loading && !error && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-gray-200">
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Showing{' '}
              <span className="font-semibold text-gray-900">
                {sortedProducts.length}
              </span>{' '}
              product{sortedProducts.length !== 1 ? 's' : ''}
              {searchInput && ` for "${searchInput}"`}
              {activeCategory !== 'all' && !searchInput && (
                <span>
                  {' '}
                  in{' '}
                  <span className="capitalize font-semibold text-blue-600">
                    {activeCategory}
                  </span>
                </span>
              )}
              {activeStockFilter !== 'all' && (
                <span className="ml-1 text-amber-700 font-medium">
                  • {activeStockFilter === 'low' ? 'Low Stock Filtered' : 'Out of Stock Filtered'}
                </span>
              )}
            </p>

            {/* Actions: Export CSV and Sort Dropdown */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <ExportCSVButton
                products={sortedProducts}
                activeStockFilter={activeStockFilter}
                activeCategory={activeCategory}
              />
              <SortDropdown value={sortBy} onChange={setSortBy} />
            </div>
          </div>
        )}

        {/* Dynamic UI Content States */}
        {loading && <LoadingSkeleton count={8} />}

        {error && !loading && (
          <ErrorState message={error} onRetry={handleRetry} />
        )}

        {!loading && !error && sortedProducts.length === 0 && (
          <EmptyState query={searchInput} />
        )}

        {!loading && !error && paginatedProducts.length > 0 && (
          <>
            <ProductGrid
              products={paginatedProducts}
              onEdit={setEditingProduct}
              onDelete={setDeletingProduct}
              onQuickView={setQuickViewProduct}
            />

            {/* Client-Side Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalItems={sortedProducts.length}
              pageSize={pageSize}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </main>

      {/* Add Product Modal */}
      <ProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        categories={categories}
        onSubmit={handleAddProduct}
      />

      {/* Edit Product Modal */}
      <ProductModal
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        categories={categories}
        onSubmit={handleUpdateProduct}
      />

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

      {/* Product Details / Quick View Modal */}
      <ProductDetailsModal
        product={quickViewProduct}
        isOpen={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
        onEdit={(prod) => {
          setQuickViewProduct(null);
          setEditingProduct(prod);
        }}
        onDelete={(prod) => {
          setQuickViewProduct(null);
          setDeletingProduct(prod);
        }}
      />
    </div>
  );
}
