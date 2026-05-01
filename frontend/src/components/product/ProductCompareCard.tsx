import React from 'react';
import { Heart, MoveUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../common/Badge';
import PlatformPill from '../common/PlatformPill';
import type { ProductSearch } from '../../types/product';
import { useWishlist } from '../../context/useWishlist';

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

type ProductCompareCardProps = {
  // Cho phép undefined để component không bị crash khi parent chưa fetch
  // xong dữ liệu hoặc API trả về 500 (array item có thể là null).
  product: ProductSearch | null | undefined;
};

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);

export default function ProductCompareCard({ product }: ProductCompareCardProps) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  // Early return để không bao giờ crash giao diện khi backend 500 / data thiếu.
  if (!product || !product.id) {
    return null;
  }

  const isSaved = isInWishlist(String(product.id));

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (isSaved) {
        await removeFromWishlist(String(product.id));
      } else {
        await addToWishlist(product);
      }
    } catch (error) {
      console.error('Lỗi thao tác wishlist:', error);
    }
  };

  // Null-safe sau khi merge: API có thể không trả về `images`/`platforms`,
  // hoặc trả 500 → các field này có thể undefined. Luôn ép về mảng trước khi
  // sort/truy cập index để tránh "Cannot read properties of undefined".
  const platforms = Array.isArray(product?.platforms) ? product.platforms : [];
  const sorted = [...platforms].sort((a, b) => (a?.finalPrice ?? 0) - (b?.finalPrice ?? 0));
  const bestOffer = sorted[0];
  const worstOffer = sorted[sorted.length - 1];
  const spread =
    worstOffer && bestOffer ? (worstOffer.finalPrice ?? 0) - (bestOffer.finalPrice ?? 0) : 0;
  const coverSrc =
    product?.images?.[0] ?? product?.imageUrl ?? '/fallback-product.jpg';

  return (
    <article
      className="group relative rounded-[34px] border border-[#DDD2C6] bg-[#F8F4EE] p-7 shadow-[0_10px_30px_rgba(33,24,19,0.06)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(33,24,19,0.08)]"
      style={{ fontFamily: FONT_STACK.sans }}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <button
          type="button"
          onClick={handleWishlistClick}
          className={`absolute left-10 top-10 z-50 cursor-pointer rounded-full border p-2.5 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 ${
            isSaved
              ? 'border-[#8E6A72] bg-[#8E6A72] text-white'
              : 'border-white/60 bg-[#F7F2EC]/88 text-[#6D6258] hover:text-[#8E6A72]'
          }`}
          style={{ pointerEvents: 'auto' }}
          aria-label={isSaved ? 'Xóa khỏi wishlist' : 'Lưu sản phẩm'}
        >
          <Heart size={14} fill={isSaved ? 'currentColor' : 'none'} strokeWidth={isSaved ? 0 : 2} />
        </button>

        <Link to={`/product/${product.id}`} className="flex min-w-0 gap-5 lg:flex-1">
          <div className="relative h-36 w-28 shrink-0 overflow-hidden rounded-[26px] bg-[#ECE4DA]">
            <img
              src={coverSrc}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              onError={(e) => {
                e.currentTarget.src = '/fallback-product.jpg';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#8D7663]">{product.brandName}</p>

            <h3
              className="mt-3 line-clamp-2 text-[1.72rem] leading-[1.12] tracking-[-0.025em] text-[#241B17] transition-colors duration-300 group-hover:text-[#3A2B23]"
              style={{ fontFamily: FONT_STACK.serif }}
            >
              {product.name}
            </h3>

            <p className="mt-3 text-sm text-[#74685F]">{product.categoryName}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(product?.score ?? 0) >= 0.8 && <Badge variant="brand">Phù hợp cao</Badge>}
              {platforms.some((p) => p?.isOfficial) && <Badge variant="soft">Official</Badge>}
            </div>
          </div>
        </Link>

        <div className="z-20 flex shrink-0 flex-col gap-3 lg:items-end">
          <p className="text-sm tracking-[0.01em] text-[#9A8A7A]">Giá tốt nhất hiện tại</p>

          {bestOffer && (
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <span className="text-[2.15rem] font-semibold leading-none tracking-[-0.045em] text-[#241B17]">
                {formatPrice(bestOffer.finalPrice)}
              </span>
              <PlatformPill platform={bestOffer.platform} />
            </div>
          )}

          {spread > 0 && (
            <p className="text-sm text-[#7A5D49] lg:text-right">
              Tiết kiệm {formatPrice(spread)} so với nơi đắt nhất
            </p>
          )}

          <Link
            to={`/product/${product.id}`}
            className="mt-1 inline-flex items-center gap-2 self-start rounded-full border border-[#2A211D] bg-[#2A211D] px-5 py-3 text-sm font-medium text-[#F6F1EA] transition hover:border-[#3A2D28] hover:bg-[#3A2D28] lg:self-end"
          >
            Xem chi tiết
            <MoveUpRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
