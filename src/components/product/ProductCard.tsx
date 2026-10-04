import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Scale, ShoppingBag } from 'lucide-react';
import { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { ResilientImage, RatingStars, formatINR } from '../common/UIElements';

export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart, wishlistIds, toggleWishlist, compareIds, toggleCompare } = useStore();

  const isWishlisted = wishlistIds.includes(product.id);
  const isCompared = compareIds.includes(product.id);
  const mainImage = product.images.find((img) => img.isMain)?.url || product.images[0]?.url;

  return (
    <article className="group flex flex-col bg-white border border-zinc-200/80 rounded-lg overflow-hidden transition-transform duration-150 hover:-translate-y-0.5">
      {/* Product Image Container (70% height emphasis on solid neutral backdrop) */}
      <div className="relative aspect-[4/3] w-full bg-[#F4F3EF] overflow-hidden">
        <Link to={`/products/${product.slug}`} className="block w-full h-full">
          <ResilientImage
            src={mainImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>

        {/* Functional Affordance Actions (Top Right) */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleWishlist(product.id);
            }}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`w-9 h-9 rounded-md flex items-center justify-center border transition-colors ${
              isWishlisted
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white/90 text-zinc-700 border-zinc-200 hover:bg-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleCompare(product.id);
            }}
            aria-label="Compare product"
            title="Compare specifications"
            className={`w-9 h-9 rounded-md flex items-center justify-center border transition-colors ${
              isCompared
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white/90 text-zinc-700 border-zinc-200 hover:bg-white'
            }`}
          >
            <Scale className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card Body — Zero-Pill Unboxed Metadata */}
      <div className="p-5 flex flex-col flex-1 justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5">
            <span>{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span>{product.subcategory}</span>
            {product.stock <= 5 && product.stock > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700 font-medium">Only {product.stock} left</span>
              </>
            )}
          </div>

          <Link
            to={`/products/${product.slug}`}
            className="block text-base font-semibold text-zinc-900 hover:text-zinc-600 transition-colors line-clamp-2 leading-snug mb-2"
          >
            {product.name}
          </Link>

          <RatingStars rating={product.ratingSummary.average} count={product.ratingSummary.count} />
        </div>

        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
          <div className="tabular-nums">
            <div className="text-[15px] font-semibold text-zinc-900">{formatINR(product.price)}</div>
            {product.originalPrice > product.price && (
              <div className="text-xs text-zinc-400 line-through">
                {formatINR(product.originalPrice)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={product.stock <= 0}
              onClick={async () => {
                const ok = await addToCart(product.id, product.variants[0]?.id, 1);
                if (!ok) navigate('/login');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{product.stock > 0 ? 'Add to Bag' : 'Out of Stock'}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
