import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Link, useParams, useLocation } from 'react-router-dom';

import ProductGallery from '../components/product/ProductGallery';
import ProductSummary from '../components/product/ProductSummary';
import QuickCompareStrip from '../components/product/QuickCompareStrip';
import PriceChart from '../components/product/PriceChart';
import AlertModal from '../components/alert/AlertModal';

import { priceComparison, priceHistory } from '../service/ProductService';
import type { PriceComparison, PriceHistory, ProductSearch } from '../types/product';
import { normalizePriceComparison } from '../util/normalizeOfferPrices';

const FONT_STACK = {
    serif: '"Times New Roman", Georgia, serif',
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

export default function ProductDetailPage() {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const previewData = location.state?.product as ProductSearch | undefined;

    const [comparison, setComparison] = useState<PriceComparison | null>(null);
    const [history, setHistory] = useState<PriceHistory | null>(null);
    const [loading, setLoading] = useState(true);
    const [alertOpen, setAlertOpen] = useState(false);

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
        return () => { cancelled = true; };
    }, [id]);

    const bestPrice = comparison?.comparisons?.[0]?.price ?? 0;

    if (loading && previewData) {
        return (
            <div className="min-h-screen bg-[#FCF8F4] dark:bg-[#0F0D0C] text-stone-900 dark:text-stone-100" style={{ fontFamily: FONT_STACK.sans }}>
                <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-10">
                    <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-stone-500 dark:text-stone-400">
                        <Link to="/search" className="inline-flex items-center gap-2 rounded-full border border-stone-200/80 dark:border-stone-700/60 bg-white/80 dark:bg-stone-800/50 px-4 py-2 transition hover:text-stone-900">
                            <ArrowLeft size={16} /> Quay lại
                        </Link>
                        <ChevronRight size={16} />
                        <span className="text-stone-900 dark:text-stone-100">{previewData.name}</span>
                    </div>
                    <section className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
                        <div className="aspect-square overflow-hidden rounded-[34px] bg-[#ECE4DA] dark:bg-stone-800">
                            {previewData.imageUrl && <img src={previewData.imageUrl} alt={previewData.name} className="h-full w-full object-cover" />}
                        </div>
                        <div className="flex flex-col gap-4">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-[#8D7663]">{previewData.brandName}</p>
                            <h1 className="text-4xl leading-tight text-stone-900 dark:text-stone-100" style={{ fontFamily: FONT_STACK.serif }}>{previewData.name}</h1>
                            <p className="text-3xl font-semibold text-stone-900 dark:text-stone-100">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(previewData.bestPrice)}
                            </p>
                            <div className="mt-4 space-y-3 animate-pulse">
                                <div className="h-4 w-3/4 rounded-full bg-stone-200 dark:bg-stone-700" />
                                <div className="h-4 w-1/2 rounded-full bg-stone-200 dark:bg-stone-700" />
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FCF8F4] dark:bg-[#0F0D0C]">
                <p className="text-sm text-stone-400 dark:text-stone-500">Đang tải...</p>
            </div>
        );
    }

    if (!comparison) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FCF8F4] dark:bg-[#0F0D0C] px-6">
                <div className="rounded-[34px] border border-stone-200/80 dark:border-stone-700/40 bg-white dark:bg-[#1A1614] px-8 py-10 text-center">
                    <h2 className="text-3xl text-stone-900 dark:text-stone-100" style={{ fontFamily: FONT_STACK.serif }}>Không tìm thấy sản phẩm</h2>
                    <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1F1A17] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90">
                        <ArrowLeft size={16} /> Quay về trang chủ
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FCF8F4] dark:bg-[#0F0D0C] text-stone-900 dark:text-stone-100" style={{ fontFamily: FONT_STACK.sans }}>
            <div className="pointer-events-none fixed left-[-10%] top-[-15%] h-[42vw] w-[42vw] rounded-full bg-[#F7ECEE] dark:bg-[#2A1F1A] opacity-30 blur-[120px]" />
            <div className="pointer-events-none fixed bottom-[-10%] right-[-6%] h-[32vw] w-[32vw] rounded-full bg-[#F4EEE7] dark:bg-[#1A1F2A] opacity-90 blur-[120px]" />

            <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-10">
                <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-stone-500 dark:text-stone-400">
                    <Link to="/search" className="inline-flex items-center gap-2 rounded-full border border-stone-200/80 dark:border-stone-700/60 bg-white/80 dark:bg-stone-800/50 px-4 py-2 transition hover:text-stone-900 dark:hover:text-stone-100">
                        <ArrowLeft size={16} /> Quay lại
                    </Link>
                    <ChevronRight size={16} />
                    <span className="text-stone-900 dark:text-stone-100">{comparison.productName}</span>
                </div>

                <section className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
                    <div>
                        <ProductGallery images={comparison.imageUrls} title={comparison.productName} showLowestBadge={false} />
                    </div>
                    <div>
                        {/* Truyền onAlertClick xuống ProductSummary */}
                        <ProductSummary
                            comparison={comparison}
                            onAlertClick={() => setAlertOpen(true)}
                        />
                    </div>
                </section>

                <section className="mt-10">
                    <QuickCompareStrip items={comparison.comparisons} />
                </section>

                <section className="mt-16">
                    {history && <PriceChart platforms={history.platforms} title="Biến động giá gần đây" />}
                </section>
            </div>

            {id && (
                <AlertModal
                    isOpen={alertOpen}
                    onClose={() => setAlertOpen(false)}
                    productId={id}
                    productName={comparison.productName}
                    defaultPrice={bestPrice}
                />
            )}
        </div>
    );
}