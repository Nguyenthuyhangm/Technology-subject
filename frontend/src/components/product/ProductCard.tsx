import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
// import Badge from '../common/Badge';
import type { Product } from '../../types/product';

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

type ProductCardProps = {
  product: Product;
};

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);

export default function ProductCard({ product }: ProductCardProps) {
  const bestOffer = [...product.platforms].sort(
    (a, b) => a.finalPrice - b.finalPrice,
  )[0];

  const imageSrc = product.images?.[0] || '/fallback-product.jpg';

  return (
    <Link to={`/product/${product.id}`} className="group block">
      <article className="glass shadow-soft overflow-hidden rounded-[32px] p-5 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
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

          <button
            type="button"
            onClick={(e) => e.preventDefault()}
            className="absolute right-4 top-4 rounded-full border border-white/40 bg-white/70 p-2.5 text-stone-500 shadow-[0_8px_20px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-300 hover:scale-[1.04] hover:text-[#8E6A72]"
            aria-label="Lưu sản phẩm"
          >
            <Heart size={15} />
          </button>
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

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-[1.4rem] font-semibold tracking-tight text-stone-900">
              {formatPrice(bestOffer.finalPrice)}
            </span>

            <span className="text-sm text-stone-300 line-through">
              {formatPrice(bestOffer.originalPrice)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}