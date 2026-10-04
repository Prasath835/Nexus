import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../services/api';
import { Product } from '../types';
import {
  ResilientImage,
  RatingStars,
  EmptyState,
  LoadingSkeleton,
  formatINR,
} from '../components/common/UIElements';

export const ComparePage: React.FC = () => {
  const { compareIds, toggleCompare, clearCompare, addToCart } = useStore();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (compareIds.length === 0) {
      setProducts([]);
      return;
    }
    setLoading(true);
    apiRequest<{ products: Product[] }>(`/products/compare?ids=${compareIds.join(',')}`)
      .then((res) => setProducts(res.data.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [compareIds]);

  const allSpecKeys = Array.from(
    new Set(products.flatMap((p) => Object.keys(p.specifications || {})))
  );

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-6 mb-8">
        <div>
          <div className="text-xs text-zinc-500 mb-1">Side-by-Side Matrix (Max 4 Products)</div>
          <h1 className="font-display text-3xl font-semibold text-zinc-900">
            Product Specification Comparison
          </h1>
        </div>
        {products.length > 0 && (
          <button
            type="button"
            onClick={clearCompare}
            className="px-4 py-2 text-xs font-medium border border-zinc-300 rounded-md hover:bg-zinc-100"
          >
            Clear All
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton rows={3} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products selected for comparison"
          description="Click the compare scale icon on any product card to compare up to 4 instruments side-by-side."
          actionLabel="Browse Catalog"
          onAction={() => navigate('/products')}
        />
      ) : (
        <div className="overflow-x-auto bg-white border border-zinc-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="p-5 w-48 text-xs font-semibold text-zinc-500 bg-[#F8F8F5] align-top">
                  Instrument
                </th>
                {products.map((p) => (
                  <th key={p.id} className="p-5 min-w-[240px] align-top border-l border-zinc-200">
                    <div className="aspect-[4/3] bg-[#F4F3EF] rounded overflow-hidden mb-3">
                      <ResilientImage
                        src={p.images[0]?.url}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs text-zinc-500 mb-1">{p.brand}</div>
                    <Link
                      to={`/products/${p.slug}`}
                      className="text-sm font-semibold text-zinc-900 hover:underline line-clamp-2"
                    >
                      {p.name}
                    </Link>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await addToCart(p.id, p.variants[0]?.id, 1);
                          if (!ok) navigate('/login');
                        }}
                        className="flex-1 py-2 px-3 text-xs font-semibold bg-zinc-900 text-white rounded hover:bg-zinc-800 inline-flex items-center justify-center gap-1.5"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add to Bag</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCompare(p.id)}
                        className="p-2 text-zinc-500 hover:text-red-600 border border-zinc-200 rounded"
                        title="Remove from comparison"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-xs">
              <tr>
                <td className="p-4 font-semibold text-zinc-700 bg-[#F8F8F5]">Price</td>
                {products.map((p) => (
                  <td key={p.id} className="p-4 font-semibold text-zinc-900 tabular-nums border-l border-zinc-200">
                    {formatINR(p.price)}{' '}
                    {p.originalPrice > p.price && (
                      <span className="text-zinc-400 line-through ml-1 font-normal">
                        {formatINR(p.originalPrice)}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-zinc-700 bg-[#F8F8F5]">Customer Rating</td>
                {products.map((p) => (
                  <td key={p.id} className="p-4 border-l border-zinc-200">
                    <RatingStars rating={p.ratingSummary.average} count={p.ratingSummary.count} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-zinc-700 bg-[#F8F8F5]">Availability</td>
                {products.map((p) => (
                  <td key={p.id} className="p-4 border-l border-zinc-200 tabular-nums">
                    {p.stock > 0 ? (
                      <span className="text-emerald-700 font-medium">In Stock ({p.stock} units)</span>
                    ) : (
                      <span className="text-red-600 font-medium">Out of Stock</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-zinc-700 bg-[#F8F8F5]">SKU</td>
                {products.map((p) => (
                  <td key={p.id} className="p-4 font-mono border-l border-zinc-200">
                    {p.sku}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-zinc-700 bg-[#F8F8F5]">Primary Material</td>
                {products.map((p) => (
                  <td key={p.id} className="p-4 border-l border-zinc-200">
                    {p.attributes.material || '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-semibold text-zinc-700 bg-[#F8F8F5]">Origin &amp; Warranty</td>
                {products.map((p) => (
                  <td key={p.id} className="p-4 border-l border-zinc-200">
                    {p.attributes.origin || '—'} · {p.attributes.warranty || 'Standard'}
                  </td>
                ))}
              </tr>
              {allSpecKeys.map((specKey) => (
                <tr key={specKey}>
                  <td className="p-4 font-semibold text-zinc-700 bg-[#F8F8F5]">{specKey}</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 text-zinc-700 border-l border-zinc-200">
                      {p.specifications?.[specKey] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
