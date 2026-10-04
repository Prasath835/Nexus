import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { apiRequest } from '../services/api';
import { Category, Product } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import {
  ResilientImage,
  LoadingSkeleton,
  ErrorState,
} from '../components/common/UIElements';

export const HomePage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'featured' | 'trending' | 'new' | 'deals'>('featured');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStorefront = async () => {
    try {
      setLoading(true);
      setError(null);
      const [catRes, prodRes] = await Promise.all([
        apiRequest<{ categories: Category[] }>('/categories'),
        apiRequest<{ products: Product[] }>('/products?limit=24'),
      ]);
      setCategories(catRes.data.categories);
      setProducts(prodRes.data.products);
    } catch (err: any) {
      setError(err.message || 'Failed to load storefront data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStorefront();
  }, []);

  const filteredShowcase = products.filter((p) => {
    if (activeTab === 'featured') return p.isFeatured;
    if (activeTab === 'trending') return p.isTrending;
    if (activeTab === 'new') return p.isNewArrival;
    if (activeTab === 'deals') return p.isDeal;
    return true;
  });

  const displayedProducts = filteredShowcase.length > 0 ? filteredShowcase.slice(0, 6) : products.slice(0, 6);

  return (
    <div className="space-y-20">
      {/* Section 1: Storefront Hero */}
      <section className="border-b border-zinc-200/80 bg-[#F4F3EF]">
        <div className="max-w-[1360px] mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="text-xs text-zinc-600 font-medium">
              2026 Autumn / Winter Collector Edition · Direct Atelier Dispatch
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold text-zinc-900 leading-[1.1] tracking-tight">
              Objects of Permanent Architectural Merit.
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed max-w-[58ch]">
              From Grade-5 titanium column-wheel chronographs and open-back planar magnetic transducers to molded walnut seating and commercial dual-boiler espresso machines.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/products"
                className="px-6 py-3 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              >
                <span>Explore Full Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/category/architectural-living"
                className="px-5 py-3 text-xs font-medium bg-white border border-zinc-300 text-zinc-900 rounded-md hover:bg-zinc-50 transition-colors whitespace-nowrap"
              >
                Architectural Living
              </Link>
            </div>

            <div className="pt-4 border-t border-zinc-300/70 grid grid-cols-3 gap-4 text-xs text-zinc-600 tabular-nums">
              <div>
                <div className="font-semibold text-zinc-900 text-sm">100%</div>
                <div>Serialized Provenance</div>
              </div>
              <div>
                <div className="font-semibold text-zinc-900 text-sm">48 Hours</div>
                <div>White-Glove Metro Air</div>
              </div>
              <div>
                <div className="font-semibold text-zinc-900 text-sm">Up to 10 Yrs</div>
                <div>Structural Warranty</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-zinc-200 shadow-sm bg-zinc-200">
              <ResilientImage
                src="/src/assets/images/hero_architectural_living_1791099634234.jpg"
                alt="Sculptural walnut lounge chair, brushed brass floor lamp, and studio audio system"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-6">
                <div className="text-white max-w-md">
                  <div className="text-xs text-zinc-200">Featured Residence Commission · Aarhus &amp; Milan</div>
                  <div className="font-display text-xl font-medium mt-0.5">
                    Soren Molded Walnut Lounge &amp; Sonora Reference Audio Suite
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Curated Collections Showcase (3-Column Grid) */}
      <section className="max-w-[1360px] mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs text-zinc-500 mb-1">01. Curated Inventory</div>
            <h2 className="font-display text-3xl font-semibold text-zinc-900">
              Atelier Instruments &amp; Editions
            </h2>
          </div>

          {/* Interactive Segmented Filter Control */}
          <div className="flex items-center gap-1 p-1 bg-zinc-200/70 rounded-lg self-start">
            {(
              [
                { id: 'featured', label: 'Featured' },
                { id: 'trending', label: 'Trending' },
                { id: 'new', label: 'New Arrivals' },
                { id: 'deals', label: 'Privilege Offers' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton rows={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={loadStorefront} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Architectural Categories Taxonomy */}
      <section className="max-w-[1360px] mx-auto px-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs text-zinc-500 mb-1">02. Departments</div>
            <h2 className="font-display text-3xl font-semibold text-zinc-900">
              Browse by Discipline
            </h2>
          </div>
          <Link
            to="/products"
            className="text-xs font-semibold text-zinc-900 hover:underline underline-offset-4 inline-flex items-center gap-1"
          >
            <span>View All Departments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="group bg-white border border-zinc-200/80 rounded-lg overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5"
            >
              <div className="aspect-[4/3] bg-[#F4F3EF] overflow-hidden">
                <ResilientImage
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-5">
                <div className="text-xs text-zinc-500 mb-1 tabular-nums">
                  {cat.productCount || 0} instruments · {cat.subcategories.slice(0, 2).join(' / ')}
                </div>
                <h3 className="font-display text-xl font-semibold text-zinc-900 group-hover:text-zinc-600 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-zinc-600 mt-1.5 line-clamp-2">{cat.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};
