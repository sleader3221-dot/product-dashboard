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
import { Sparkles, PackageCheck } from 'lucide-react';

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

  // Search & Filter states
  const [searchInput, setSearchInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  // KPI Filter: 'all' | 'categories' | 'low_stock' | 'out_of_stock'
  const [kpiFilter, setKpiFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');

  // Client-Side Pagination (16 products per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 16;

  // Dialog states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  const debouncedSearch = useDebounce(searchInput, 300);

  // Initial catalog fetch on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle debounced search: instantly resets page to 1
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

  // Search input typing handler: instantly resets page to 1
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    setCurrentPage(1);
    if (val.trim() && activeCategory !== 'all') {
      setActiveCategory('all');
    }
  };

  // Clear search input (X button): instantly resets page to 1
  const handleClearSearch = () => {
    setSearchInput('');
    setCurrentPage(1);
    if (activeCategory === 'all') {
      fetchProducts();
    } else {
      fetchByCategory(activeCategory);
    }
  };

  // Category change handler: instantly resets page to 1
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

  // Interactive 4 KPI Cards Filter handler:
  // - Clicking 'Total Products' sets kpiFilter to 'all'
  // - Clicking 'Low Stock (<10)' sets kpiFilter to 'low_stock'
  // - Clicking 'Out of Stock' sets kpiFilter to 'out_of_stock'
  // - Clicking 'Categories' scrolls smoothly to #category-bar
  // - Clicking any card ALWAYS resets currentPage to 1
  const handleSelectKpiFilter = (filterKey) => {
    setCurrentPage(1);

    if (filterKey === 'categories') {
      const bar = document.getElementById('category-bar');
      if (bar) {
        bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (filterKey === 'all') {
      setKpiFilter('all');
    } else if (kpiFilter === filterKey) {
      // Toggle back to 'all' if clicking already selected filter
      setKpiFilter('all');
    } else {
      setKpiFilter(filterKey);
    }
  };

  const handleClearKpiFilter = () => {
    setKpiFilter('all');
    setCurrentPage(1);
  };

  // Global reset for all filters
  const handleResetAllFilters = () => {
    setSearchInput('');
    setActiveCategory('all');
    setKpiFilter('all');
    setSortBy('default');
    setCurrentPage(1);
    fetchProducts();
  };

  // Retry handler for network error state
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

  // Pagination navigation with smooth scroll
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 250, behavior: 'smooth' });
    }
  };

  // 1. Filter by KPI Stock Filter ('all' | 'low_stock' | 'out_of_stock')
  const filteredProducts = useMemo(() => {
    if (kpiFilter === 'low_stock') {
      return products.filter(
        (p) => Number(p.stock) > 0 && Number(p.stock) <= 10
      );
    }
    if (kpiFilter === 'out_of_stock') {
      return products.filter((p) => Number(p.stock) === 0);
    }
    return products;
  }, [products, kpiFilter]);

  // 2. Operational Sorting
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
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
  }, [filteredProducts, sortBy]);

  // Total pages calculation and boundary auto-clamping
  const totalPages = Math.ceil(sortedProducts.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // 3. Client-Side Pagination Slicing
  const paginatedProducts = useMemo(() => {
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    return sortedProducts.slice(startIndex, startIndex + pageSize);
  }, [sortedProducts, currentPage, totalPages, pageSize]);

  return (
    <div className="min-h-screen bg-gray-50/70">
      {/* Header Navbar with integrated search input, X clear button, and Add Product CTA */}
      <Navbar
        searchInput={searchInput}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        onAddClick={() => setIsAddModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Interactive 4 KPI Cards: Instant Filters with active rings & smooth scroll */}
        <QuickStats
          products={allProducts && allProducts.length > 0 ? allProducts : products}
          categories={categories}
          kpiFilter={kpiFilter}
          onSelectKpiFilter={handleSelectKpiFilter}
        />

        {/* Category Filter Tabs via FilterBar (#category-bar) */}
        <FilterBar
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={handleCategoryChange}
        />

        {/* Active Filters Bar (Shows pills with individual removal & Reset button) */}
        <ActiveFiltersBar
          searchInput={searchInput}
          activeCategory={activeCategory}
          kpiFilter={kpiFilter}
          resultCount={sortedProducts.length}
          onClearSearch={handleClearSearch}
          onClearCategory={handleClearCategory}
          onClearKpiFilter={handleClearKpiFilter}
          onResetAll={handleResetAllFilters}
        />

        {/* Toolbar: Result Count, [⬇ Export CSV], and Sort Dropdown */}
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
              {kpiFilter === 'low_stock' && (
                <span className="ml-1 text-amber-700 font-medium">
                  • Low Stock (&le;10) Filtered
                </span>
              )}
              {kpiFilter === 'out_of_stock' && (
                <span className="ml-1 text-rose-700 font-medium">
                  • Out of Stock Filtered
                </span>
              )}
            </p>

            {/* Actions: Export CSV and Sort Dropdown */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <ExportCSVButton
                products={sortedProducts}
                kpiFilter={kpiFilter}
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

        {/* Special Out of Stock Friendly Empty State */}
        {!loading && !error && kpiFilter === 'out_of_stock' && sortedProducts.length === 0 && (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-emerald-100 shadow-xs my-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              🎉
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              All Items Are In Stock!
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Your inventory is in great shape. No products are currently out of stock.
            </p>
            <button
              type="button"
              onClick={() => {
                setKpiFilter('all');
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-200 cursor-pointer active:scale-95"
            >
              <PackageCheck className="h-4 w-4" />
              View All Products
            </button>
          </div>
        )}

        {/* Standard Empty State for queries with no results */}
        {!loading && !error && kpiFilter !== 'out_of_stock' && sortedProducts.length === 0 && (
          <EmptyState query={searchInput} />
        )}

        {/* Product Grid and Pagination */}
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

      {/* Delete Confirmation Modal (Double-confirmation safety) */}
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
          // Double-confirmation: Closes Quick View and opens Delete Confirmation dialog
          setQuickViewProduct(null);
          setDeletingProduct(prod);
        }}
      />
    </div>
  );
}
