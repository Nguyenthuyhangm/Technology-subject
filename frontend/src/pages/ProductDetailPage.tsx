import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import ProductGallery from '../components/product/ProductGallery';
import ProductSummary from '../components/product/ProductSummary';
import QuickCompareStrip from '../components/product/QuickCompareStrip';
import PriceChart from '../components/product/PriceChart';

import { priceComparison, priceHistory } from '../service/ProductService';
import type { PriceComparison, PriceHistory } from '../types/product';
import { normalizePriceComparison } from '../util/normalizeOfferPrices';

const FONT_STACK = {
    serif: '"Times New Roman", Georgia, serif',
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

export default function ProductDetailPage() {
    const { id } = useParams<{ id: string }>();

    const [comparison, setComparison] = useState<PriceComparison | null>(null);
    const [history, setHistory] = useState<PriceHistory | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        let cancelled = false;

        void (async () => {
            setLoading(true);
            try {
                const [comp, hist] = await Promise.all([
                    priceComparison(id),
                    priceHistory(id),
                ]);
                if (cancelled) return;
                setComparison(normalizePriceComparison(comp));
                setHistory(hist);
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id]);

    // Loading state
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FCF8F4]">
                <p className="text-sm text-stone-400">Đang tải...</p>
            </div>
        );
    }

    // Not found
    if (!comparison) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FCF8F4] px-6">
                <div className="rounded-[34px] border border-stone-200/80 bg-white px-8 py-10 text-center shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
                    <h2 className="text-3xl text-stone-900" style={{ fontFamily: FONT_STACK.serif }}>
                        Không tìm thấy sản phẩm
                    </h2>
                    <Link
                        to="/"
                        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1F1A17] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                    >
                        <ArrowLeft size={16} />
                        Quay về trang chủ
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FCF8F4] text-stone-900" style={{ fontFamily: FONT_STACK.sans }}>
            <div className="pointer-events-none fixed left-[-10%] top-[-15%] h-[42vw] w-[42vw] rounded-full bg-[#F7ECEE] opacity-30 blur-[120px]" />
            <div className="pointer-events-none fixed bottom-[-10%] right-[-6%] h-[32vw] w-[32vw] rounded-full bg-[#F4EEE7] opacity-90 blur-[120px]" />

            <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-10">

                {/* Breadcrumb */}
                <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-stone-500">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/80 px-4 py-2 transition hover:text-stone-900"
                    >
                        <ArrowLeft size={16} />
                        Trang chủ
                    </Link>
                    <ChevronRight size={16} />
                    <span className="text-stone-900">{comparison.productName}</span>
                </div>

                {/* Gallery + Summary */}
                <section className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
                    <div>
<ProductGallery
    images={comparison.imageUrls} // Bây giờ nó đã là một mảng [ảnh_gốc, ảnh_sàn1, ảnh_sàn2...]
    title={comparison.productName}
    showLowestBadge={false}
/>
                    </div>
                    <div>
                        <ProductSummary comparison={comparison} />
                    </div>
                </section>

                {/* So sánh giá các sàn */}
                <section className="mt-10">
                    <QuickCompareStrip items={comparison.comparisons} />
                </section>

                {/* Line chart lịch sử giá */}
                <section className="mt-16">
                    {history && (
                        <PriceChart
                            platforms={history.platforms}
                            title="Biến động giá gần đây"
                        />
                    )}
                </section>

            </div>
        </div>
    );
}