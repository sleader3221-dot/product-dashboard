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
import { exportToPdf } from '@/utils/generatePdf';
import toast from 'react-hot-toast';

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

  // Search input typing handler: resets pagination to 1
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    setCurrentPage(1);
    if (val.trim() && activeCategory !== 'all') {
      setActiveCategory('all');
    }
  };

  // Clear search input (X button): resets pagination to 1
  const handleClearSearch = () => {
    setSearchInput('');
    setCurrentPage(1);
    if (activeCategory === 'all') {
      fetchProducts();
    } else {
      fetchByCategory(activeCategory);
    }
  };

  // Category change handler: resets pagination to 1
  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setSearchInput('');
    setCurrentPage(1);
    if (category === 'all') {
      setKpiFilter('all');
      fetchProducts();
    } else {
      setKpiFilter('categories');
      fetchByCategory(category);
    }
  };

  const handleClearCategory = () => {
    handleCategoryChange('all');
  };

  // Interactive 4 KPI Cards Filter handler:
  // - Clicking 'Total Products': resets kpiFilter to 'all' and activeCategory to 'all'
  // - Clicking 'Categories': switches active category and scrolls smoothly to category bar
  // - Clicking 'Low Stock (<10)': resets activeCategory to 'all' so user sees ALL 13 low-stock items in the store!
  // - Clicking 'Out of Stock': resets activeCategory to 'all' and shows celebratory in-stock state
  // - Clicking any card ALWAYS resets currentPage to 1
  const handleSelectKpiFilter = (filterKey) => {
    setCurrentPage(1);

    if (filterKey === 'categories') {
      setKpiFilter('categories');

      // Seamlessly switch to first category if 'all', or cycle to next category
      if (categories && categories.length > 0) {
        const catSlugs = categories.map((c) => c.slug || c);
        const currentIndex = catSlugs.indexOf(activeCategory);
        const nextIndex =
          currentIndex === -1 ? 0 : (currentIndex + 1) % catSlugs.length;
        const nextCategory = catSlugs[nextIndex];
        setActiveCategory(nextCategory);
        setSearchInput('');
        fetchByCategory(nextCategory);
      }

      // Smooth scroll to category bar
      const bar = document.getElementById('category-bar');
      if (bar) {
        bar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    if (filterKey === 'all') {
      setKpiFilter('all');
      setActiveCategory('all');
      setSearchInput('');
      fetchProducts();
      return;
    }

    if (filterKey === 'low_stock') {
      // If clicking low stock, reset category to 'all' so user sees all low-stock items in store
      setKpiFilter('low_stock');
      setActiveCategory('all');
      setSearchInput('');
      fetchProducts();
      return;
    }

    if (filterKey === 'out_of_stock') {
      setKpiFilter('out_of_stock');
      setActiveCategory('all');
      setSearchInput('');
      fetchProducts();
      return;
    }

    if (kpiFilter === filterKey) {
      setKpiFilter('all');
      setActiveCategory('all');
      fetchProducts();
    } else {
      setKpiFilter(filterKey);
    }
  };

  const handleClearKpiFilter = () => {
    setKpiFilter('all');
    setActiveCategory('all');
    setCurrentPage(1);
    fetchProducts();
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

  // Executive PDF Inventory Audit Report handler
  const handleExportPdf = () => {
    if (!sortedProducts || sortedProducts.length === 0) {
      toast.error('No products available to generate PDF audit report');
      return;
    }

    let activeFilterLabel = 'Full Catalog';
    if (kpiFilter === 'low_stock') {
      activeFilterLabel = 'Low Stock Reorder Sheet';
    } else if (kpiFilter === 'out_of_stock') {
      activeFilterLabel = 'Out of Stock Alert Sheet';
    } else if (activeCategory !== 'all') {
      activeFilterLabel = `Category: ${activeCategory.toUpperCase()}`;
    } else if (searchInput) {
      activeFilterLabel = `Search: "${searchInput}"`;
    }

    toast.success('Generating inventory audit report...');

    try {
      exportToPdf({
        products: sortedProducts,
        activeFilter: activeFilterLabel,
      });
    } catch (err) {
      toast.error('Failed to generate PDF report');
    }
  };

  // Base catalog: Always use the living allProducts if available
  const baseCatalog =
    allProducts && allProducts.length > 0 ? allProducts : products;

  // 1. Unified Multi-Stage Filter Pipeline
  const filteredProducts = useMemo(() => {
    let list = baseCatalog;

    // A. Filter by Search Query
    if (searchInput && searchInput.trim()) {
      const q = searchInput.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // B. Filter by Category (if not 'all')
    if (activeCategory && activeCategory !== 'all') {
      const cat = activeCategory.toLowerCase().trim();
      list = list.filter(
        (p) => p.category && p.category.toLowerCase().trim() === cat
      );
    }

    // C. Filter by KPI Stock Filter
    if (kpiFilter === 'low_stock' || kpiFilter === 'low') {
      list = list.filter(
        (p) => Number(p.stock) > 0 && Number(p.stock) <= 10
      );
    } else if (kpiFilter === 'out_of_stock' || kpiFilter === 'out') {
      list = list.filter((p) => Number(p.stock) === 0);
    }

    return list;
  }, [baseCatalog, searchInput, activeCategory, kpiFilter]);

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
          activeCategory={activeCategory}
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

            {/* Actions: Export CSV, Export PDF, and Sort Dropdown */}
            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              <ExportCSVButton
                products={sortedProducts}
                kpiFilter={kpiFilter}
                activeCategory={activeCategory}
              />
              <button
                type="button"
                onClick={handleExportPdf}
                title="Download Executive PDF Inventory Audit Report"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs sm:text-sm font-medium transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
              >
                <span>📄</span>
                <span>Export PDF</span>
                {sortedProducts.length > 0 && (
                  <span className="text-[11px] text-slate-300 font-normal">
                    ({sortedProducts.length})
                  </span>
                )}
              </button>
              <SortDropdown value={sortBy} onChange={setSortBy} />
            </div>
          </div>
        )}

        {/* Dynamic UI Content States */}
        {loading && <LoadingSkeleton count={8} />}

        {error && !loading && (
          <ErrorState message={error} onRetry={handleRetry} />
        )}

        {/* Contextual Empty State */}
        {!loading && !error && sortedProducts.length === 0 && (
          <EmptyState
            query={searchInput}
            category={activeCategory}
            kpiFilter={kpiFilter}
            onResetFilters={handleResetAllFilters}
            onClearSearch={handleClearSearch}
            onClearCategory={handleClearCategory}
            onClearKpiFilter={handleClearKpiFilter}
          />
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
