import { useMemo, useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ProductCompareCard from '../components/product/ProductCompareCard';
import { searchProducts } from '../service/ProductService';
import type { ProductSearch, PlatformName } from '../types/product';
import AppHeader from '../components/layout/AppHeader';

const FONT_STACK = {
    serif: '"Times New Roman", Georgia, serif',
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

// Danh sách platform có thể lọc. VALUE phải trùng CHÍNH XÁC platform.name
// trong DB (kể cả hoa/thường) vì API trả về đúng chuỗi đó, FE dùng làm key
// lookup PlatformPill style / so sánh ===. DB hiện lưu:
//   'Cocolux', 'guardian' (lowercase), 'Hasaki'.
// Backend filter lowercase 2 phía nên case-insensitive khi query, nhưng
// FE vẫn phải giữ value giống DB.
const PLATFORM_OPTIONS: PlatformName[] = ['Cocolux', 'guardian', 'Hasaki'];

// Capitalize chữ cái đầu cho label hiển thị — không đổi value gửi API.
function formatPlatformLabel(name: string): string {
    if (!name) return name;
    return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Cách đồng bộ state giữa UI và API call:
 *  - `selectedPlatforms`: Set<PlatformName> rỗng = "Tất cả sàn" (không filter).
 *  - URL ↔ state: đọc/ghi `?q=` và `?platform=` (lặp nhiều lần cho multi-select).
 *  - useEffect depend vào [query, platformsKey] với platformsKey là chuỗi
 *    sorted join(',') để tránh re-fetch thừa khi user tick rồi untick cùng chip.
 */
export default function SearchResultsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') ?? '';
    const initialPlatforms = searchParams.getAll('platform') as PlatformName[];

    const [query, setQuery] = useState(initialQuery);
    const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformName>>(
        () => new Set(initialPlatforms),
    );
    const [onlyOfficial, setOnlyOfficial] = useState(false);
    const [sortBy, setSortBy] = useState<'best-price' | 'rating' | 'reviews'>('best-price');
    const [products, setProducts] = useState<ProductSearch[]>([]);
    const [loading, setLoading] = useState(false);

    // Chuẩn hoá mảng platform: sort + dedup để key ổn định giữa các render.
    const selectedPlatformsArr = useMemo(
        () => Array.from(selectedPlatforms).sort(),
        [selectedPlatforms],
    );
    const platformsKey = selectedPlatformsArr.join(',');

    // Re-fetch mỗi khi query hoặc selection platform đổi.
    // Ưu tiên làm cho filter hoạt động ngay (không cần bấm "Tìm kiếm" lại).
    useEffect(() => {
        if (!query) {
            setProducts([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        searchProducts(query, { platforms: selectedPlatformsArr })
            .then((data) => {
                if (cancelled) return;
                setProducts(data);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('[SearchResultsPage] searchProducts failed:', err);
                setProducts([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, platformsKey]);

    // Đồng bộ filter lên URL để giữ deep-link khi user share/reload.
    useEffect(() => {
        const next = new URLSearchParams();
        if (query) next.set('q', query);
        for (const p of selectedPlatformsArr) next.append('platform', p);
        setSearchParams(next, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, platformsKey]);

    const onSubmitSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Submit form chỉ dùng để chốt keyword; useEffect trên sẽ tự fetch lại.
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (query) next.set('q', query);
            else next.delete('q');
            return next;
        });
    };

    const togglePlatform = (name: PlatformName) => {
        setSelectedPlatforms((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const clearPlatforms = () => setSelectedPlatforms(new Set());

    const isAllSelected = selectedPlatforms.size === 0;

    const summaryText = useMemo(() => {
        const parts: string[] = [];
        parts.push(`${products.length} kết quả`);
        if (!isAllSelected) {
            parts.push(`trên ${selectedPlatformsArr.map(formatPlatformLabel).join(', ')}`);
        }
        if (onlyOfficial) parts.push('ưu tiên gian hàng chính hãng');
        if (sortBy === 'best-price') parts.push('sắp theo giá tốt nhất');
        else if (sortBy === 'rating') parts.push('sắp theo đánh giá cao');
        else parts.push('sắp theo nhiều review');
        return parts.join(' · ');
    }, [products.length, onlyOfficial, selectedPlatformsArr, isAllSelected, sortBy]);

    return (
        <div className="min-h-screen bg-[#FCF8F4] dark:bg-[#0F0D0C] text-stone-900 dark:text-stone-100" style={{ fontFamily: FONT_STACK.sans }}>
            <div className="pointer-events-none fixed left-[-10%] top-[-12%] h-[40vw] w-[40vw] rounded-full bg-[#F7ECEE] dark:bg-[#2A1F1A] opacity-30 blur-[120px]" />
            <div className="pointer-events-none fixed bottom-[-10%] right-[-6%] h-[30vw] w-[30vw] rounded-full bg-[#F4EEE7] dark:bg-[#1A1F2A] opacity-90 blur-[120px]" />

            <AppHeader currentPage="search" />

            <main className="mx-auto max-w-7xl px-6 pb-20 pt-36 lg:px-12">
                <section className="mb-10">
                    <div className="max-w-3xl">
                        <h1
                            className="mt-3 text-4xl leading-[1.12] text-stone-900 md:text-5xl"
                            style={{ fontFamily: FONT_STACK.serif }}
                        >
                            Tìm một món bạn đang cân nhắc,
                            <br className="hidden md:block" />
                            so sánh theo cách nhẹ nhàng hơn.
                        </h1>
                    </div>

                    <form
                        onSubmit={onSubmitSearch}
                        className="mt-8 rounded-[32px] border border-stone-200/60 dark:border-stone-700/40 bg-[#FBF8F3] dark:bg-[#1A1614] p-4 shadow-[0_10px_30px_rgba(28,24,20,0.04)]"
                    >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                            <div className="flex flex-1 items-center rounded-full bg-white dark:bg-stone-800/60 px-5 py-3.5 ring-1 ring-stone-200/60 dark:ring-stone-700/40">
                                <Search className="h-4 w-4 text-stone-400" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Tìm theo tên sản phẩm, thương hiệu hoặc model"
                                    className="ml-3 w-full bg-transparent text-[15px] text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-600"
                                />
                            </div>
                            <button
                                type="submit"
                                className="rounded-full bg-[#1F1A17] px-6 py-3.5 text-sm font-medium text-white transition hover:opacity-90"
                            >
                                Tìm kiếm
                            </button>
                        </div>

                        <div className="mt-4 flex flex-col gap-4 pt-2 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex flex-wrap gap-2">
                                {/* "Tất cả sàn" = clear filter. Active khi không chip nào được chọn. */}
                                <button
                                    type="button"
                                    onClick={clearPlatforms}
                                    aria-pressed={isAllSelected}
                                    className={`rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.06em] transition ${isAllSelected
                                            ? 'bg-[#F3EDE5] dark:bg-[#2A221A] text-[#2C241F] dark:text-[#E8D5B8] ring-1 ring-[#DED3C7] dark:ring-[#4A3A2A]'
                                            : 'bg-transparent text-stone-500 dark:text-stone-400 ring-1 ring-stone-200/70 dark:ring-stone-700/50 hover:text-stone-900 dark:hover:text-stone-100'
                                        }`}
                                >
                                    Tất cả sàn
                                </button>

                                {PLATFORM_OPTIONS.map((item) => {
                                    const active = selectedPlatforms.has(item);
                                    return (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => togglePlatform(item)}
                                            aria-pressed={active}
                                            className={`rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.06em] transition ${active
                                                    ? 'bg-[#F3EDE5] text-[#2C241F] ring-1 ring-[#DED3C7]'
                                                    : 'bg-transparent text-stone-500 ring-1 ring-stone-200/70 hover:text-stone-900'
                                                }`}
                                        >
                                            {formatPlatformLabel(item)}
                                        </button>
                                    );
                                })}

                                <button
                                    type="button"
                                    onClick={() => setOnlyOfficial((prev) => !prev)}
                                    className={`rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.04em] transition ${onlyOfficial
                                            ? 'bg-[#F3EDE5] text-[#2C241F] ring-1 ring-[#DED3C7]'
                                            : 'bg-transparent text-stone-500 ring-1 ring-stone-200/70 hover:text-stone-900'
                                        }`}
                                >
                                    Official
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className={`text-sm text-stone-400 dark:text-stone-500`}>Sắp xếp theo</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as 'best-price' | 'rating' | 'reviews')}
                                    className="rounded-full bg-white dark:bg-stone-800/60 px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 outline-none ring-1 ring-stone-200/70 dark:ring-stone-700/40 transition focus:ring-stone-300"
                                >
                                    <option value="best-price">Giá tốt nhất</option>
                                    <option value="rating">Đánh giá cao</option>
                                    <option value="reviews">Nhiều review</option>
                                </select>
                            </div>
                        </div>
                    </form>

                    <div className="mt-5">
                        <p className="text-sm leading-7 text-stone-500">
                            {loading ? 'Đang tải kết quả…' : summaryText}
                        </p>
                    </div>
                </section>

                <section className="space-y-6">
                    {products.length > 0 ? (
                        products.map((product) => (
                            <ProductCompareCard key={product.id} product={product} />
                        ))
                    ) : (
                        <div className="rounded-[34px] border border-white/50 bg-white/80 p-4 backdrop-blur-md shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                            <p className="text-[11px] uppercase tracking-normal text-[#8E6A72]">
                                Không có kết quả phù hợp
                            </p>
                            <h2 className="mt-3 text-3xl text-stone-900" style={{ fontFamily: FONT_STACK.serif }}>
                                Chưa có lựa chọn đủ phù hợp
                            </h2>
                            <p className="mt-4 text-sm leading-7 text-stone-500">
                                Thử từ khóa ngắn hơn hoặc giảm bớt điều kiện lọc để xem thêm sản phẩm phù hợp hơn với nhu cầu của bạn.
                            </p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
