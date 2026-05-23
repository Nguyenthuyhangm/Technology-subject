import Badge from '../common/Badge';
import PlatformPill from '../common/PlatformPill';
import { MoveUpRight } from 'lucide-react';
import type { PriceComparisonItem } from '../../types/product';
import { toAffiliateLink } from '../../util/affiliateLink';

type QuickCompareStripProps = {
    items: PriceComparisonItem[];
};

const formatPrice = (price: number): string =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(price);

export default function QuickCompareStrip({ items }: QuickCompareStripProps) {
    const sorted = [...items].sort((a, b) => a.price - b.price);
    const best = sorted[0];

    return (
        <section>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                    <h2 className="mt-1 text-[1.45rem] font-medium tracking-[-0.02em] text-stone-900 dark:text-stone-100">
                        Nơi mua phù hợp
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-stone-500 dark:text-stone-400">
                        So sánh nhanh giá, ưu đãi để chọn nơi mua phù hợp hơn.
                    </p>
                </div>

                {best && (
                    <p className="text-sm text-stone-500">
                        Tốt nhất hiện tại:{' '}
                        <span className="font-medium text-stone-800 dark:text-stone-200">{best.platformName}</span>
                    </p>
                )}
            </div>

            <div className="mt-5 overflow-x-auto pb-2">
                <div className="flex min-w-max gap-3 snap-x snap-mandatory">
                    {sorted.map((item, index) => {
                        const isBest = index === 0;
                        const itemUrl = toAffiliateLink(item.url, item.platformName);

                        return (
                            <article
                                key={item.listingId}
                                className={`w-[248px] shrink-0 snap-start rounded-[20px] border p-4 transition-all duration-200 ${
                                    isBest
                                        ? 'border-[#D9CEC1] dark:border-stone-600 bg-[#F6F0E8] dark:bg-stone-800/80'
                                        : 'border-stone-200/70 dark:border-stone-700/40 bg-white dark:bg-[#1A1614]'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <PlatformPill platform={item.platformName} compact />
                                        {item.promotionLabel && (
                                            <p className="mt-2 truncate text-xs text-stone-500">
                                                {item.promotionLabel}
                                            </p>
                                        )}
                                    </div>
                                    {isBest && (
                                        <span className="rounded-full bg-[#E9DED1] px-2.5 py-1 text-[10px] font-medium text-[#5B4A3E]">
                                            Tốt nhất
                                        </span>
                                    )}
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    {item.isFlashSale && <Badge variant="danger">Flash Sale</Badge>}
                                    {item.inStock
                                        ? <Badge variant="success">Còn hàng</Badge>
                                        : <Badge variant="soft">Hết hàng</Badge>
                                    }
                                </div>

                                <div className="mt-4">
                                    <p className="text-[1.35rem] font-semibold leading-none tracking-[-0.03em] text-stone-900 dark:text-stone-100">
                                        {formatPrice(item.price)}
                                    </p>
                                    <div className="mt-2 space-y-1 text-[12px] leading-5 text-stone-500">
                                        {item.originalPrice > item.price && (
                                            <p className="line-through">Gốc {formatPrice(item.originalPrice)}</p>
                                        )}
                                        {item.discountPct > 0 && (
                                            <p>Giảm {item.discountPct}%</p>
                                        )}
                                    </div>
                                </div>

                                <a href={itemUrl} target="_blank" rel="noreferrer"
                                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-700 px-3 py-2 text-[12px] font-medium text-stone-700 dark:text-stone-300 transition hover:text-stone-900 dark:hover:text-stone-100">
                                    Xem nơi bán <MoveUpRight size={12} />
                                </a>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}