import { Bell, Heart, MoveUpRight } from 'lucide-react';
import Badge from '../common/Badge';
import PlatformPill from '../common/PlatformPill';
import type { PriceComparison } from '../../types/product';
import type { WishlistComparisonStub } from '../../types/wishlist';
import { useWishlist } from '../../context/useWishlist';

const FONT_STACK = {
    serif: '"Times New Roman", Georgia, serif',
    sans:
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

type ProductSummaryProps = {
    comparison: PriceComparison;
};

const formatPrice = (price: number): string =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(price);

export default function ProductSummary({ comparison }: ProductSummaryProps) {
    // 2. Lấy hàm từ WishlistContext
    const { addToWishlist, removeFromWishlist, isInWishlist, isRemoving } = useWishlist();

    const productId = comparison.productId;
    const isSaved = isInWishlist(productId);
    const removing = isRemoving(productId);

    const sorted = [...comparison.comparisons].sort((a, b) => a.price - b.price);
    const bestOffer = sorted[0];

    // 3. Hàm xử lý Click — provider đã lo optimistic update + rollback + alert.
    const handleWishlistClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (removing) return;

        if (isSaved) {
            await removeFromWishlist(productId);
        } else {
            const payload: WishlistComparisonStub = {
                id: productId,
                name: comparison.productName,
                platforms: comparison.comparisons,
            };
            await addToWishlist(payload);
        }
    };

    if (!bestOffer) return null;

    return (
        <div
            className="rounded-[34px] border border-stone-200/80 bg-white p-7 shadow-soft"
            style={{ fontFamily: FONT_STACK.sans }}
        >
            <h1
                className="text-[2.45rem] leading-[1.05] tracking-[-0.02em] text-stone-900 md:text-[2.95rem]"
                style={{ fontFamily: FONT_STACK.serif }}
            >
                {comparison.productName}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-stone-500">
                {bestOffer.isFlashSale && (
                    <Badge variant="danger">Flash Sale</Badge>
                )}
                {bestOffer.inStock ? (
                    <Badge variant="success">Còn hàng</Badge>
                ) : (
                    <Badge variant="soft">Hết hàng</Badge>
                )}
            </div>

            <div className="mt-8 rounded-[30px] bg-gradient-to-br from-[#F8F1F3] to-white p-6">
                <p className="text-[11px] uppercase tracking-[0.12em] text-stone-400">
                    Giá đẹp nhất hiện tại
                </p>

                <div className="mt-3 flex flex-wrap items-end gap-3">
                    <span className="text-[2.8rem] font-semibold tracking-[-0.03em] text-[#8E6A72]">
                        {formatPrice(bestOffer.price)}
                    </span>

                    {bestOffer.originalPrice > bestOffer.price && (
                        <span className="pb-2 text-sm text-stone-300 line-through">
                            {formatPrice(bestOffer.originalPrice)}
                        </span>
                    )}

                    {bestOffer.discountPct > 0 && (
                        <span className="pb-2 text-sm font-medium text-[#8E6A72]">
                            -{bestOffer.discountPct}%
                        </span>
                    )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <PlatformPill platform={bestOffer.platformName} />
                    {bestOffer.promotionLabel && (
                        <Badge variant="soft">{bestOffer.promotionLabel}</Badge>
                    )}
                </div>

                <div className="mt-5 rounded-[22px] border border-white/60 bg-white/70 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-sm">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-stone-400">
                        Nơi bán tốt nhất
                    </p>

                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-stone-900">
                            {bestOffer.platformName}
                        </p>

                        <a
                            href={bestOffer.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-[#8E6A72] transition hover:text-stone-900"
                        >
                            Đến cửa hàng
                            <MoveUpRight size={15} />
                        </a>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
                <a
                    href={bestOffer.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1F1A17] px-6 py-4 text-sm font-medium text-white transition hover:opacity-90"
                >
                    Mua tại {bestOffer.platformName}
                    <MoveUpRight size={16} />
                </a>

                <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-4 text-sm font-medium text-stone-700 transition hover:text-[#8E6A72] cursor-pointer"
                >
                    <Bell size={16} />
                    Đặt alert
                </button>

                {/* 4. NÚT LƯU WISHLIST ĐÃ CÓ LOGIC VÀ ĐỔI MÀU */}
                <button
                    type="button"
                    onClick={handleWishlistClick}
                    disabled={removing}
                    className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-4 text-sm font-medium transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                        isSaved
                            ? 'border-[#8E6A72] bg-[#8E6A72] text-white hover:opacity-90'
                            : 'border-stone-200 bg-white text-stone-700 hover:text-[#8E6A72]'
                    }`}
                >
                    <Heart
                        size={16}
                        fill={isSaved ? "currentColor" : "none"}
                        strokeWidth={isSaved ? 0 : 2}
                    />
                    {removing ? 'Đang xóa...' : isSaved ? 'Đã lưu wishlist' : 'Lưu wishlist'}
                </button>
            </div>
        </div>
    );
}