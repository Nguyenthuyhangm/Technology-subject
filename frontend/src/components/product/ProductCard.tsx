import React from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product, ProductSearch } from '../../types/product';
import { useWishlist } from '../../context/useWishlist'; 

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

type ProductCardProps = {
  product: Product | ProductSearch;
};

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);

export default function ProductCard({ product }: ProductCardProps) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  
  // So sánh ID dạng String để khớp với UUID
  const isSaved = isInWishlist(String(product.id));

  const bestOffer = [...product.platforms].sort(
    (a, b) => a.finalPrice - b.finalPrice,
  )[0];

  const finalRounded = Math.round(bestOffer.finalPrice);
  const originalRounded = Math.round(
    bestOffer.originalPrice ?? bestOffer.finalPrice,
  );
  const showSale =
    originalRounded > finalRounded &&
    originalRounded > 0 &&
    Number.isFinite(originalRounded);
  const discountPct =
    typeof bestOffer.discountPct === 'number'
      ? bestOffer.discountPct
      : showSale
        ? Math.min(
            100,
            Math.max(
              0,
              Math.round(
                ((originalRounded - finalRounded) / originalRounded) * 100,
              ),
            ),
          )
        : 0;

  const imageSrc = product.images?.[0] || '/fallback-product.jpg';

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    
    if (isSaved) {
      removeFromWishlist(String(product.id));
    } else {
      addToWishlist(product);
    }
  };

  return (
    <div className="group relative">
      {/* 1. NÚT TRÁI TIM: Nằm ngoài Link để không bị đè cursor */}
      <button
        type="button"
        onClick={handleWishlistClick}
        className={`absolute right-9 top-9 z-50 cursor-pointer rounded-full border border-white/40 p-2.5 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 ${
          isSaved 
            ? 'bg-[#8E6A72] text-white border-[#8E6A72]' 
            : 'bg-white/70 text-stone-500 hover:text-[#8E6A72]'
        }`}
        style={{ pointerEvents: 'auto' }}
        aria-label={isSaved ? "Xóa khỏi wishlist" : "Lưu sản phẩm"}
      >
        <Heart 
          size={18} 
          fill={isSaved ? "currentColor" : "none"} 
          strokeWidth={isSaved ? 0 : 2}
        />
      </button>

      {/* 2. THẺ LINK: Chỉ chứa nội dung hiển thị sản phẩm */}
      <Link to={`/product/${product.id}`} className="block">
        <article className="glass shadow-soft relative overflow-hidden rounded-[32px] p-5 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
          <div className="relative overflow-hidden rounded-[26px] bg-[#F6F1EB]">
            <img
              src={imageSrc}
              alt={product.name}
              className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              onError={(e) => {
                e.currentTarget.src = '/fallback-product.jpg';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-black/0 to-white/10" />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <span className="caption-soft text-[10px] font-medium uppercase text-[#8E6A72]">
                {product.brand}
              </span>
              <span className="text-xs text-stone-400">
                {product.category}
              </span>
            </div>

            <h3
              className="editorial-title mt-3 line-clamp-2 text-[1.45rem] text-stone-900 transition-colors duration-300 group-hover:text-[#8E6A72]"
              style={{ fontFamily: FONT_STACK.serif }}
            >
              {product.name}
            </h3>

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="text-[1.4rem] font-semibold tracking-tight text-stone-900">
                {formatPrice(finalRounded)}
              </span>
              {showSale && (
                <>
                  <span className="text-sm text-stone-300 line-through">
                    {formatPrice(originalRounded)}
                  </span>
                  {discountPct > 0 && (
                    <span className="text-sm font-medium text-[#8E6A72]">
                      -{discountPct}%
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </article>
      </Link>
    </div>
  );
}