import { useMemo, useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import ProductCompareCard from '../components/product/ProductCompareCard';
import { searchProducts, getProductsByCategory } from '../service/ProductService';
import type { ProductSearch, PlatformName } from '../types/product';
import AppHeader from '../components/layout/AppHeader';

const FONT_STACK = {
    serif: '"Times New Roman", Georgia, serif',
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

const promotionOptions = [
    { id: 'all', name: 'Tất cả' },
    { id: 'sale', name: 'Đang giảm giá' },
    { id: 'flash_sale', name: 'Flash Sale' },
];

// 🔥 MỚI: Định nghĩa các nhóm danh mục dựa theo TẤT CẢ slug từ Database (bao gồm cả có dấu và không dấu)
const SKINCARE_SLUGS = [
    'kem-chống-nắng', 'kem-chong-nang', 
    'serum', 
    'sữa-rửa-mặt', 'sua-rua-mat', 
    'toner', 
    'kem-dưỡng', 'kem-duong', 
    'mặt-nạ', 'mat-na', 
    'tẩy-da-chết', 
    'dưỡng-thể', 
    'sữa-tắm'
];

const MAKEUP_SLUGS = [
    'son-thỏi', 
    'phấn-phủ', 
    'son-môi', 'son-moi', 
    'kem-nền', 'kem-nen', 
    'phấn-mắt', 'phan-mat', 
    'má-hồng', 'ma-hong', 
    'cushion', 
    'kẻ-mắt', 
    'mascara', 
    'tẩy-trang', 'tay-trang', 
    'nước-hoa'
];

const HAIRCARE_SLUGS = [
    'dầu-gội', 'dau-goi', 
    'tạo-kiểu-tóc', 
    'dầu-xả', 
    'dưỡng-tóc'
];

export default function SearchResultsPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') ?? '';

    const [query, setQuery] = useState(initialQuery);
    const [platform, setPlatform] = useState<PlatformName | 'all'>('all');
    const [onlyOfficial, setOnlyOfficial] = useState(false);
    const [sortBy, setSortBy] = useState<'best-price' | 'rating' | 'reviews'>('best-price');
    const [products, setProducts] = useState<ProductSearch[]>([]);
    
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedPromo, setSelectedPromo] = useState<string>('all');

    useEffect(() => {
        fetch('http://localhost:8080/api/categories/all')
            .then(res => res.json())
            .then(data => setCategories(data))
            .catch(err => console.error("Lỗi load category:", err));
    }, []);

    // 🔥 SỬA CHỖ NÀY: Mở khóa để khi chỉ chọn Danh mục (không cần từ khóa) cũng load được sản phẩm
    useEffect(() => {
        if (query) {
            searchProducts(query, selectedCategory, selectedPromo)
                .then(data => setProducts(data))
                .catch(err => console.error(err));
        } else if (selectedCategory !== 'all') {
            // Khi ô tìm kiếm trống, nhưng người dùng có chọn danh mục ở Dropdown
            getProductsByCategory(selectedCategory)
                .then(data => setProducts(data))
                .catch(err => console.error(err));
        } else if (slug) {
            // Khi truy cập trực tiếp từ URL
            getProductsByCategory(slug)
                .then(data => setProducts(data))
                .catch(err => console.error(err));
        } else {
            setProducts([]);
        }
    }, [query, slug, selectedCategory, selectedPromo]);

    const onSubmitSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (slug && query) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
        } else {
            setSearchParams(query ? { q: query } : {});
        }
    };

    const summaryText = useMemo(() => {
        const parts: string[] = [];
        parts.push(`${products.length} kết quả`);
        if (selectedPromo !== 'all') parts.push(`loại: ${promotionOptions.find(p => p.id === selectedPromo)?.name}`);
        if (onlyOfficial) parts.push('ưu tiên gian hàng chính hãng');
        if (sortBy === 'best-price') parts.push('sắp theo giá tốt nhất');
        else if (sortBy === 'rating') parts.push('sắp theo đánh giá cao');
        else parts.push('sắp theo nhiều review');
        return parts.join(' · ');
    }, [products.length, onlyOfficial, selectedPromo, sortBy]);

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
                                {promotionOptions.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setSelectedPromo(item.id)}
                                        className={`rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.06em] transition ${
                                            selectedPromo === item.id
                                                ? 'bg-[#F3EDE5] text-[#2C241F] ring-1 ring-[#DED3C7]'
                                                : 'bg-transparent text-stone-500 ring-1 ring-stone-200/70 hover:text-stone-900'
                                        }`}
                                    >
                                        {item.name}
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

                            <div className="flex items-center gap-4 flex-wrap">
                                {/* 🔥 SỬA CHỖ NÀY: Dùng optgroup để phân nhóm danh mục */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-stone-400">Danh mục</span>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="rounded-full bg-white px-4 py-2.5 text-sm text-stone-700 outline-none ring-1 ring-stone-200/70 transition focus:ring-stone-300 cursor-pointer max-w-[180px]"
                                    >
                                        <option value="all">Tất cả danh mục</option>
                                        
                                        <optgroup label="🌿 Chăm sóc da">
                                            {categories.filter(c => SKINCARE_SLUGS.includes(c.slug)).map(cat => (
                                                <option key={cat.id} value={cat.slug}>{cat.name}</option>
                                            ))}
                                        </optgroup>

                                        <optgroup label="💄 Trang điểm">
                                            {categories.filter(c => MAKEUP_SLUGS.includes(c.slug)).map(cat => (
                                                <option key={cat.id} value={cat.slug}>{cat.name}</option>
                                            ))}
                                        </optgroup>

                                        <optgroup label="💇‍♀️ Chăm sóc tóc">
                                            {categories.filter(c => HAIRCARE_SLUGS.includes(c.slug)).map(cat => (
                                                <option key={cat.id} value={cat.slug}>{cat.name}</option>
                                            ))}
                                        </optgroup>

                                        <optgroup label="📦 Khác">
                                            {categories.filter(c => !SKINCARE_SLUGS.includes(c.slug) && !MAKEUP_SLUGS.includes(c.slug) && !HAIRCARE_SLUGS.includes(c.slug)).map(cat => (
                                                <option key={cat.id} value={cat.slug}>{cat.name}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-stone-400">Sắp xếp theo</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as 'best-price' | 'rating' | 'reviews')}
                                        className="rounded-full bg-white px-4 py-2.5 text-sm text-stone-700 outline-none ring-1 ring-stone-200/70 transition focus:ring-stone-300 cursor-pointer"
                                    >
                                        <option value="best-price">Giá tốt nhất</option>
                                        <option value="rating">Đánh giá cao</option>
                                        <option value="reviews">Nhiều review</option>
                                    </select>
                                </div>
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