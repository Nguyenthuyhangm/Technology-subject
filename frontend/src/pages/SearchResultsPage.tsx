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

const platformOptions: Array<PlatformName | 'all'> = [
    'all',
    'Coculux',
    'Gardian',
    'Hasaki',
];

export default function SearchResultsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') ?? '';

    const [query, setQuery] = useState(initialQuery);
    const [platform, setPlatform] = useState<PlatformName | 'all'>('all');
    const [onlyOfficial, setOnlyOfficial] = useState(false);
    const [sortBy, setSortBy] = useState<'best-price' | 'rating' | 'reviews'>('best-price');
    const [products, setProducts] = useState<ProductSearch[]>([]);

    useEffect(() => {
        if (!query) return;
        searchProducts(query)
            .then(data => setProducts(data))
            .catch(err => console.error(err));
    }, [query]);

    const onSubmitSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSearchParams(query ? { q: query } : {});
    };

    const summaryText = useMemo(() => {
        const parts: string[] = [];
        parts.push(`${products.length} kết quả`);
        if (platform !== 'all') parts.push(`trên ${platform}`);
        if (onlyOfficial) parts.push('ưu tiên gian hàng chính hãng');
        if (sortBy === 'best-price') parts.push('sắp theo giá tốt nhất');
        else if (sortBy === 'rating') parts.push('sắp theo đánh giá cao');
        else parts.push('sắp theo nhiều review');
        return parts.join(' · ');
    }, [products.length, onlyOfficial, platform, sortBy]);

    return (
        <div className="min-h-screen bg-[#FCF8F4] text-stone-900" style={{ fontFamily: FONT_STACK.sans }}>
            <div className="pointer-events-none fixed left-[-10%] top-[-12%] h-[40vw] w-[40vw] rounded-full bg-[#F7ECEE] opacity-30 blur-[120px]" />
            <div className="pointer-events-none fixed bottom-[-10%] right-[-6%] h-[30vw] w-[30vw] rounded-full bg-[#F4EEE7] opacity-90 blur-[120px]" />

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
                        className="mt-8 rounded-[32px] border border-stone-200/60 bg-[#FBF8F3] p-4 shadow-[0_10px_30px_rgba(28,24,20,0.04)]"
                    >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                            <div className="flex flex-1 items-center rounded-full bg-white px-5 py-3.5 ring-1 ring-stone-200/60">
                                <Search className="h-4 w-4 text-stone-400" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Tìm theo tên sản phẩm, thương hiệu hoặc model"
                                    className="ml-3 w-full bg-transparent text-[15px] text-stone-900 outline-none placeholder:text-stone-400"
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
                                {platformOptions.map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => setPlatform(item)}
                                        className={`rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.06em] transition ${
                                            platform === item
                                                ? 'bg-[#F3EDE5] text-[#2C241F] ring-1 ring-[#DED3C7]'
                                                : 'bg-transparent text-stone-500 ring-1 ring-stone-200/70 hover:text-stone-900'
                                        }`}
                                    >
                                        {item === 'all' ? 'Tất cả sàn' : item}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => setOnlyOfficial((prev) => !prev)}
                                    className={`rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.04em] transition ${
                                        onlyOfficial
                                            ? 'bg-[#F3EDE5] text-[#2C241F] ring-1 ring-[#DED3C7]'
                                            : 'bg-transparent text-stone-500 ring-1 ring-stone-200/70 hover:text-stone-900'
                                    }`}
                                >
                                    Official
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-sm text-stone-400">Sắp xếp theo</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as 'best-price' | 'rating' | 'reviews')}
                                    className="rounded-full bg-white px-4 py-2.5 text-sm text-stone-700 outline-none ring-1 ring-stone-200/70 transition focus:ring-stone-300"
                                >
                                    <option value="best-price">Giá tốt nhất</option>
                                    <option value="rating">Đánh giá cao</option>
                                    <option value="reviews">Nhiều review</option>
                                </select>
                            </div>
                        </div>
                    </form>

                    <div className="mt-5">
                        <p className="text-sm leading-7 text-stone-500">{summaryText}</p>
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