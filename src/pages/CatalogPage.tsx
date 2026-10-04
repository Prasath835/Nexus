import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { apiRequest } from '../services/api';
import { Category, Product } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import {
  LoadingSkeleton,
  EmptyState,
  ErrorState,
  Pagination,
} from '../components/common/UIElements';

export const CatalogPage: React.FC = () => {
  const { slug: categoryRouteSlug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 9, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states synced with URL or local controls
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(categoryRouteSlug || searchParams.get('category') || 'all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedMaterial, setSelectedMaterial] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (categoryRouteSlug) {
      setSelectedCategory(categoryRouteSlug);
      setSelectedSubcategory('all');
      setPage(1);
    }
  }, [categoryRouteSlug]);

  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam !== null) {
      setSearchQuery(qParam);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    apiRequest<{ categories: Category[] }>('/categories')
      .then((res) => setCategories(res.data.categories))
      .catch(() => {});
  }, []);

  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedSubcategory !== 'all') params.set('subcategory', selectedSubcategory);
      if (selectedBrand !== 'all') params.set('brand', selectedBrand);
      if (selectedMaterial !== 'all') params.set('material', selectedMaterial);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (minRating) params.set('minRating', minRating);
      if (inStockOnly) params.set('inStock', 'true');
      params.set('sort', sortBy);
      params.set('page', String(page));
      params.set('limit', '9');

      const res = await apiRequest<{
        products: Product[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
        facets: { brands: string[]; materials: string[] };
      }>(`/products?${params.toString()}`);

      setProducts(res.data.products);
      setPagination(res.data.pagination);
      setBrands(res.data.facets.brands);
      setMaterials(res.data.facets.materials);
    } catch (err: any) {
      setError(err.message || 'Could not load catalog.');
    } finally {
      setLoading(false);
    }
  }, [
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    selectedBrand,
    selectedMaterial,
    minPrice,
    maxPrice,
    minRating,
    inStockOnly,
    sortBy,
    page,
  ]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const activeCategoryObj = categories.find(
    (c) => c.slug === selectedCategory || c.name === selectedCategory
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    if (!categoryRouteSlug) setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedBrand('all');
    setSelectedMaterial('all');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setInStockOnly(false);
    setSortBy('relevance');
    setPage(1);
    setSearchParams({});
  };

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs text-zinc-500 mb-1">
            Aethelgard Catalog · {pagination.total} {pagination.total === 1 ? 'Instrument' : 'Instruments'}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-900">
            {activeCategoryObj ? activeCategoryObj.name : 'Complete Collection'}
          </h1>
          {activeCategoryObj && (
            <p className="text-sm text-zinc-600 mt-1 max-w-2xl">{activeCategoryObj.description}</p>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-3 self-start md:self-end">
          <label htmlFor="sort-select" className="text-xs text-zinc-600 font-medium whitespace-nowrap">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 text-xs font-medium bg-white border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
          >
            <option value="relevance">Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest Arrivals</option>
            <option value="rating">Customer Rating</option>
            <option value="popularity">Popularity</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter Specifications</span>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Keyword Filter */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-2">Keyword or SKU</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. Titanium, Planar, KR-CAL09..."
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-2">Department</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubcategory('all');
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-md"
            >
              <option value="all">All Departments</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name} ({cat.productCount || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Filter */}
          {activeCategoryObj && activeCategoryObj.subcategories.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-2">Subcategory</label>
              <select
                value={selectedSubcategory}
                onChange={(e) => {
                  setSelectedSubcategory(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-md"
              >
                <option value="all">All Subcategories</option>
                {activeCategoryObj.subcategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Brand Filter */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-2">Maker / Brand</label>
            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-md"
            >
              <option value="all">All Makers</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Material Attribute Filter */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-2">Primary Material</label>
            <select
              value={selectedMaterial}
              onChange={(e) => {
                setSelectedMaterial(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-md"
            >
              <option value="all">All Materials</option>
              {materials.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-2">Price Range (₹ INR)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                placeholder="Min ₹"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-xs bg-white border border-zinc-300 rounded-md tabular-nums"
              />
              <input
                type="number"
                min="0"
                placeholder="Max ₹"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-xs bg-white border border-zinc-300 rounded-md tabular-nums"
              />
            </div>
          </div>

          {/* Minimum Rating */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-2">Minimum Rating</label>
            <select
              value={minRating}
              onChange={(e) => {
                setMinRating(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-md"
            >
              <option value="">Any Rating</option>
              <option value="4.8">4.8 Stars &amp; Above</option>
              <option value="4.5">4.5 Stars &amp; Above</option>
              <option value="4">4.0 Stars &amp; Above</option>
            </select>
          </div>

          {/* Stock Availability */}
          <label className="flex items-center gap-2.5 text-xs text-zinc-800 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => {
                setInStockOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            <span>In-stock ready for immediate dispatch</span>
          </label>
        </aside>

        {/* Product Grid */}
        <div className="lg:col-span-9">
          {loading ? (
            <LoadingSkeleton rows={4} />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchCatalog} />
          ) : products.length === 0 ? (
            <EmptyState
              title="No matching instruments found"
              description="No products matched your current filter combination. Try broadening your price range or clearing active filters."
              actionLabel="Reset All Filters"
              onAction={handleResetFilters}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(nextPage) => setPage(nextPage)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
