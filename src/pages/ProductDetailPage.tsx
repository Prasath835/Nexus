import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Heart,
  Scale,
  ShoppingBag,
  Zap,
  Truck,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { Product, ProductVariant, Review, Question } from '../types';
import { useStore } from '../context/StoreContext';
import {
  ResilientImage,
  RatingStars,
  LoadingSkeleton,
  ErrorState,
  formatINR,
} from '../components/common/UIElements';
import { ProductCard } from '../components/product/ProductCard';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const {
    user,
    addToCart,
    setBuyNowItem,
    wishlistIds,
    toggleWishlist,
    compareIds,
    toggleCompare,
    showToast,
  } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pincode check state
  const [pincode, setPincode] = useState('122009');
  const [deliveryResult, setDeliveryResult] = useState<any | null>(null);
  const [checkingPincode, setCheckingPincode] = useState(false);

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Question form state
  const [questionText, setQuestionText] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  const loadProduct = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<{
        product: Product;
        reviews: Review[];
        questions: Question[];
        relatedProducts: Product[];
      }>(`/products/${slug}`);

      const prod = res.data.product;
      setProduct(prod);
      setSelectedVariant(prod.variants[0] || null);
      setSelectedImage(prod.images.find((i) => i.isMain)?.url || prod.images[0]?.url || '');
      setQuantity(1);
      setReviews(res.data.reviews);
      setQuestions(res.data.questions);
      setRelatedProducts(res.data.relatedProducts);
    } catch (err: any) {
      setError(err.message || 'Product not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
  }, [slug]);

  const handleCheckPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCheckingPincode(true);
      const res = await apiRequest(`/products/delivery-check?pincode=${encodeURIComponent(pincode)}`);
      setDeliveryResult(res.data);
    } catch (err: any) {
      showToast(err.message || 'Invalid pincode', 'error');
      setDeliveryResult(null);
    } finally {
      setCheckingPincode(false);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (!user) {
      showToast('Please sign in to proceed with Buy Now.', 'error');
      navigate('/login');
      return;
    }
    setBuyNowItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      quantity,
    });
    navigate('/checkout?mode=buynow');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!user) {
      showToast('Please sign in to submit a review.', 'error');
      navigate('/login');
      return;
    }
    try {
      setSubmittingReview(true);
      const res = await apiRequest<{ review: Review; ratingSummary: Product['ratingSummary'] }>(
        '/reviews',
        {
          method: 'POST',
          body: JSON.stringify({
            productId: product.id,
            rating: reviewRating,
            title: reviewTitle,
            comment: reviewComment,
          }),
        }
      );
      setReviews((prev) => [res.data.review, ...prev]);
      setProduct((prev) => (prev ? { ...prev, ratingSummary: res.data.ratingSummary } : prev));
      setReviewTitle('');
      setReviewComment('');
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await apiRequest(`/reviews/${reviewId}`, { method: 'DELETE' });
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      showToast('Review deleted.', 'info');
      loadProduct();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!user) {
      showToast('Please sign in to ask a product question.', 'error');
      navigate('/login');
      return;
    }
    try {
      setSubmittingQuestion(true);
      const res = await apiRequest<{ question: Question }>('/questions', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          question: questionText,
        }),
      });
      setQuestions((prev) => [res.data.question, ...prev]);
      setQuestionText('');
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-12">
        <LoadingSkeleton rows={4} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-12">
        <ErrorState message={error || 'Product not found'} onRetry={loadProduct} />
      </div>
    );
  }

  const activePrice = selectedVariant ? selectedVariant.price : product.price;
  const activeOriginalPrice = selectedVariant ? selectedVariant.originalPrice : product.originalPrice;
  const activeStock = selectedVariant ? selectedVariant.stock : product.stock;
  const activeSku = selectedVariant ? selectedVariant.sku : product.sku;
  const isWishlisted = wishlistIds.includes(product.id);
  const isCompared = compareIds.includes(product.id);

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10 space-y-16">
      {/* Breadcrumb */}
      <nav className="text-xs text-zinc-500 flex items-center gap-2">
        <Link to="/" className="hover:text-zinc-900">
          Home
        </Link>
        <span>/</span>
        <Link to={`/category/${product.categorySlug}`} className="hover:text-zinc-900">
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-zinc-900 font-medium">{product.name}</span>
      </nav>

      {/* Primary PDP Module: Sticky Gallery Left + Contiguous Purchase Module Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left: Product Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/3] w-full bg-[#F4F3EF] border border-zinc-200 rounded-lg overflow-hidden">
            <ResilientImage
              src={selectedImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img) => (
                <button
                  key={img.publicId}
                  type="button"
                  onClick={() => setSelectedImage(img.url)}
                  className={`w-20 h-16 rounded-md overflow-hidden border-2 shrink-0 ${
                    selectedImage === img.url ? 'border-zinc-900' : 'border-transparent opacity-70'
                  }`}
                >
                  <ResilientImage src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-5 bg-white border border-zinc-200/90 rounded-lg p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
              <span>{product.brand}</span>
              <span aria-hidden="true">·</span>
              <span>{product.subcategory}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">SKU: {activeSku}</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-zinc-900 leading-tight mb-3">
              {product.name}
            </h1>

            <RatingStars
              rating={product.ratingSummary.average}
              count={product.ratingSummary.count}
              size="md"
            />
          </div>

          {/* Pricing Block */}
          <div className="pt-4 border-t border-zinc-100 tabular-nums">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-semibold text-zinc-900">{formatINR(activePrice)}</span>
              {activeOriginalPrice > activePrice && (
                <>
                  <span className="text-sm text-zinc-400 line-through">
                    {formatINR(activeOriginalPrice)}
                  </span>
                  <span className="text-xs font-medium text-emerald-700">
                    Save {Math.round(((activeOriginalPrice - activePrice) / activeOriginalPrice) * 100)}%
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Exclusive of 18% GST (calculated authoritatively at checkout)
            </p>
          </div>

          <p className="text-sm text-zinc-600 leading-relaxed">{product.description}</p>

          {/* Variant Selector */}
          {product.variants.length > 0 && (
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-zinc-800">
                Select Configuration ({product.variants.length} options)
              </label>
              <div className="grid grid-cols-1 gap-2">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const label = [v.color, v.size, v.capacity, v.finish].filter(Boolean).join(' · ');
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariant(v);
                        setQuantity(1);
                      }}
                      className={`p-3 rounded-md border text-left transition-colors flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-zinc-900 bg-zinc-900/5'
                          : 'border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-zinc-900">
                          {label || v.sku}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          SKU: {v.sku} · {v.stock > 0 ? `${v.stock} in stock` : 'Out of stock'}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-zinc-900 tabular-nums">
                        {formatINR(v.price)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & Primary Purchase CTAs */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-800">Quantity</span>
              <span className="text-xs text-zinc-500 tabular-nums">
                {activeStock > 0 ? `${activeStock} units available` : 'Out of stock'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center border border-zinc-300 rounded-md bg-white tabular-nums">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  −
                </button>
                <span className="px-4 py-2 text-xs font-semibold text-zinc-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(activeStock, q + 1))}
                  className="px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                disabled={activeStock <= 0}
                onClick={async () => {
                  const ok = await addToCart(product.id, selectedVariant?.id, quantity);
                  if (!ok) navigate('/login');
                }}
                className="flex-1 py-2.5 px-4 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-40 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Bag</span>
              </button>

              <button
                type="button"
                disabled={activeStock <= 0}
                onClick={handleBuyNow}
                className="py-2.5 px-4 text-xs font-semibold bg-amber-700 text-white rounded-md hover:bg-amber-800 disabled:opacity-40 transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Zap className="w-4 h-4" />
                <span>Buy Now</span>
              </button>
            </div>

            {/* Secondary Wishlist & Compare Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className="py-2 px-3 text-xs font-medium border border-zinc-200 rounded-md hover:bg-zinc-50 inline-flex items-center justify-center gap-1.5"
              >
                <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-zinc-900 text-zinc-900' : ''}`} />
                <span>{isWishlisted ? 'Saved in Wishlist' : 'Save to Wishlist'}</span>
              </button>
              <button
                type="button"
                onClick={() => toggleCompare(product.id)}
                className="py-2 px-3 text-xs font-medium border border-zinc-200 rounded-md hover:bg-zinc-50 inline-flex items-center justify-center gap-1.5"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{isCompared ? 'In Comparison' : 'Add to Compare'}</span>
              </button>
            </div>
          </div>

          {/* Delivery Pincode Verification */}
          <div className="pt-4 border-t border-zinc-200 space-y-2.5">
            <label className="block text-xs font-semibold text-zinc-800">
              Check White-Glove Delivery Availability
            </label>
            <form onSubmit={handleCheckPincode} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter 6-digit pincode"
                className="flex-1 px-3 py-2 text-xs border border-zinc-300 rounded-md font-mono"
              />
              <button
                type="submit"
                disabled={checkingPincode}
                className="px-4 py-2 text-xs font-semibold bg-zinc-100 text-zinc-900 border border-zinc-300 rounded-md hover:bg-zinc-200 whitespace-nowrap"
              >
                {checkingPincode ? 'Checking...' : 'Check Pincode'}
              </button>
            </form>
            {deliveryResult && (
              <div className="flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-md">
                <Truck className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{deliveryResult.message}</div>
                  <div className="text-emerald-700">
                    Pincode {deliveryResult.pincode} · Cash on Delivery &amp; Insured Transit Available
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Technical Specifications & Provenance */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-8 border-t border-zinc-200">
        <div className="lg:col-span-4">
          <div className="text-xs text-zinc-500 mb-1">01. Engineering Sheet</div>
          <h2 className="font-display text-2xl font-semibold text-zinc-900">
            Technical Specifications
          </h2>
          <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
            Every Aethelgard instrument ships with a serialized calibration certificate and full manufacturer warranty.
          </p>
        </div>

        <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100">
          {Object.entries(product.specifications || {}).map(([key, val]) => (
            <div key={key} className="px-6 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <span className="font-medium text-zinc-500">{key}</span>
              <span className="sm:col-span-2 font-medium text-zinc-900">{val}</span>
            </div>
          ))}
          {product.attributes.origin && (
            <div className="px-6 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <span className="font-medium text-zinc-500">Country of Origin</span>
              <span className="sm:col-span-2 font-medium text-zinc-900">{product.attributes.origin}</span>
            </div>
          )}
          {product.attributes.warranty && (
            <div className="px-6 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <span className="font-medium text-zinc-500">Warranty Coverage</span>
              <span className="sm:col-span-2 font-medium text-zinc-900">{product.attributes.warranty}</span>
            </div>
          )}
        </div>
      </section>

      {/* Customer Reviews & Verified Purchase Engine */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-8 border-t border-zinc-200">
        <div className="lg:col-span-4 space-y-6">
          <div>
            <div className="text-xs text-zinc-500 mb-1">02. Collector Feedback</div>
            <h2 className="font-display text-2xl font-semibold text-zinc-900">
              Verified Reviews ({reviews.length})
            </h2>
            <p className="text-xs text-zinc-600 mt-1">
              The “Verified Purchase” designation is computed strictly on the backend by verifying delivered order records.
            </p>
          </div>

          <form
            onSubmit={handleSubmitReview}
            className="bg-white border border-zinc-200 rounded-lg p-5 space-y-4"
          >
            <h3 className="text-sm font-semibold text-zinc-900">Write a Review</h3>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Rating</label>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-md"
              >
                <option value={5}>5 Stars — Exceptional</option>
                <option value={4}>4 Stars — Very Good</option>
                <option value={3}>3 Stars — Satisfactory</option>
                <option value={2}>2 Stars — Subpar</option>
                <option value={1}>1 Star — Unacceptable</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Headline</label>
              <input
                type="text"
                required
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Summarize your ownership experience"
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Detailed Review (min 10 chars)
              </label>
              <textarea
                rows={3}
                required
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share build quality, acoustics, or performance details..."
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-md"
              />
            </div>
            <button
              type="submit"
              disabled={submittingReview}
              className="w-full py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-40"
            >
              {submittingReview ? 'Submitting...' : 'Publish Review'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-8 space-y-4">
          {reviews.length === 0 ? (
            <div className="p-8 bg-white border border-zinc-200 rounded-lg text-center text-xs text-zinc-500">
              No reviews published for this instrument yet.
            </div>
          ) : (
            reviews.map((rev) => (
              <article
                key={rev.id}
                className="bg-white border border-zinc-200 rounded-lg p-6 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="font-semibold text-zinc-900">{rev.userName}</span>
                    {rev.verifiedPurchase && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified Purchase
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{new Date(rev.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>

                  {user && (user.id === rev.userId || user.role === 'admin') && (
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(rev.id)}
                      className="text-xs text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                <RatingStars rating={rev.rating} />
                <h4 className="text-sm font-semibold text-zinc-900">{rev.title}</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">{rev.comment}</p>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Questions & Specialist Answers */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-8 border-t border-zinc-200">
        <div className="lg:col-span-4 space-y-4">
          <div>
            <div className="text-xs text-zinc-500 mb-1">03. Technical Concierge</div>
            <h2 className="font-display text-2xl font-semibold text-zinc-900">
              Questions &amp; Answers ({questions.length})
            </h2>
          </div>

          <form
            onSubmit={handleAskQuestion}
            className="bg-white border border-zinc-200 rounded-lg p-5 space-y-3"
          >
            <label className="block text-xs font-semibold text-zinc-900">
              Ask a Technical Question
            </label>
            <textarea
              rows={3}
              required
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Ask about dimensions, power requirements, or compatibility..."
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-md"
            />
            <button
              type="submit"
              disabled={submittingQuestion}
              className="w-full py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
            >
              {submittingQuestion ? 'Sending...' : 'Submit Question'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-8 space-y-4">
          {questions.length === 0 ? (
            <div className="p-8 bg-white border border-zinc-200 rounded-lg text-center text-xs text-zinc-500">
              No questions asked yet.
            </div>
          ) : (
            questions.map((q) => (
              <div key={q.id} className="bg-white border border-zinc-200 rounded-lg p-6 space-y-3">
                <div className="text-xs text-zinc-500">
                  Asked by <strong className="text-zinc-900">{q.userName}</strong> ·{' '}
                  {new Date(q.createdAt).toLocaleDateString('en-IN')}
                </div>
                <div className="text-sm font-semibold text-zinc-900">Q: {q.question}</div>
                {q.answer ? (
                  <div className="pl-4 border-l-2 border-zinc-900 space-y-1">
                    <div className="text-xs text-zinc-700 leading-relaxed">A: {q.answer}</div>
                    <div className="text-[11px] text-zinc-500">
                      Answered by {q.answeredBy} ·{' '}
                      {q.answeredAt ? new Date(q.answeredAt).toLocaleDateString('en-IN') : ''}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-700">
                    Pending response from Aethelgard technical specialist.
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="pt-8 border-t border-zinc-200">
          <h2 className="font-display text-2xl font-semibold text-zinc-900 mb-6">
            Complementary Instruments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedProducts.map((rp) => (
              <ProductCard key={rp.id} product={rp} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
