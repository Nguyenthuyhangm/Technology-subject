import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useRecommendations } from "../util/useRecommendations";
import type { RecommendationProduct } from "../types/recommendation";

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
} as const;

const formatPrice = (price: number | null) => {
  if (!price) return "Đang cập nhật";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
};

function ProductCard({ product }: { product: RecommendationProduct }) {
  return (
    <Link to={`/product/${product.id}`} className="group block">
      <article className="glass relative overflow-hidden rounded-[32px] p-5 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
        <div className="relative overflow-hidden rounded-[26px] bg-[#F6F1EB] dark:bg-stone-800">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <div className="aspect-[4/5] w-full flex items-center justify-center text-xs text-stone-400">
              Không có ảnh
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-black/0 to-white/10" />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#8E6A72]">
              {product.brandName}
            </span>
            <span className="text-[10px] text-stone-400">{product.categoryName}</span>
          </div>

          <h3
            className="mt-2 line-clamp-2 text-[1.2rem] leading-[1.25] tracking-[-0.02em] text-stone-900 dark:text-stone-100 transition-colors group-hover:text-[#8E6A72]"
            style={{ fontFamily: FONT_STACK.serif }}
          >
            {product.name}
          </h3>

          <p className="mt-3 text-[1.1rem] font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            {formatPrice(product.lowestPrice)}
          </p>
        </div>
      </article>
    </Link>
  );
}

interface RecommendationSectionProps {
  userId: string;
}

export default function RecommendationSection({ userId }: RecommendationSectionProps) {
  const { products, loading, error, hasMore, loadMore } = useRecommendations(userId);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (!loading && products.length === 0 && !hasMore) {
    return (
      <section className="mt-16">
        <div className="rounded-[32px] border border-stone-200/80 dark:border-stone-700/40 bg-white/80 dark:bg-[#1A1614]/80 p-8 backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#8E6A72]">Recommendation</p>
          <h2
            className="mt-2 text-3xl tracking-[-0.02em] text-stone-900 dark:text-stone-100"
            style={{ fontFamily: FONT_STACK.serif }}
          >
            Chưa có đủ dữ liệu để gợi ý
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-500 dark:text-stone-400">
            Hãy thêm một vài sản phẩm vào wishlist để PriceHawk hiểu sở thích của bạn hơn.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-16">
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[#8E6A72]">Recommendation</p>
        <h2
          className="mt-2 text-3xl tracking-[-0.02em] text-stone-900 dark:text-stone-100 md:text-4xl"
          style={{ fontFamily: FONT_STACK.serif }}
        >
          Gợi ý dành cho bạn
        </h2>
        <p className="mt-2 text-sm leading-7 text-stone-500 dark:text-stone-400">
          Dựa trên wishlist của bạn.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-1" />

      {loading && (
        <div className="mt-8 flex justify-center">
          <Loader2 size={20} className="animate-spin text-stone-400" />
        </div>
      )}

      {!hasMore && products.length > 0 && (
        <p className="mt-8 text-center text-sm text-stone-400">
          Đã hiển thị tất cả sản phẩm gợi ý
        </p>
      )}

      {error && (
        <p className="mt-4 text-center text-sm text-red-400">{error}</p>
      )}
    </section>
  );
}
