import { useMemo, useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import ProductCompareCard from '../components/product/ProductCompareCard';
import { searchProducts, getProductsByCategory } from '../service/ProductService';
import type { ProductSearch } from '../types/product';
import AppHeader from '../components/layout/AppHeader';

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;


const promotionOptions = [
  { id: 'all', name: 'Tất cả' },
  { id: 'sale', name: 'Đang giảm giá' },
  { id: 'flash_sale', name: 'Flash Sale' },
] as const;

const SKINCARE_SLUGS = ['kem-chống-nắng', 'kem-chong-nang', 'serum', 'sữa-rửa-mặt', 'sua-rua-mat', 'toner', 'kem-dưỡng', 'kem-duong', 'mặt-nạ', 'mat-na', 'tẩy-da-chết', 'dưỡng-thể', 'sữa-tắm'];
const MAKEUP_SLUGS = ['son-thỏi', 'phấn-phủ', 'son-môi', 'son-moi', 'kem-nền', 'kem-nen', 'phấn-mắt', 'phan-mat', 'má-hồng', 'ma-hong', 'cushion', 'kẻ-mắt', 'mascara', 'tẩy-trang', 'tay-trang', 'nước-hoa'];
const HAIRCARE_SLUGS = ['dầu-gội', 'dau-goi', 'tạo-kiểu-tóc', 'dầu-xả', 'dưỡng-tóc'];

type CategoryItem = { id: string | number; name: string; slug: string };

function formatPlatformLabel(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';


  const [query, setQuery] = useState(initialQuery);

  const [onlyOfficial, setOnlyOfficial] = useState(false);
  const [sortBy, setSortBy] = useState<'best-price' | 'rating' | 'reviews'>('best-price');
  const [products, setProducts] = useState<ProductSearch[]>([]);
  const [loading, setLoading] = useState(false);



  // Re-fetch mỗi khi query hoặc selection platform đổi.
  // Ưu tiên làm cho filter hoạt động ngay (không cần bấm "Tìm kiếm" lại).
  useEffect(() => {
    if (!query) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchProducts(query)
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
  }, [query]);

  // Đồng bộ filter lên URL để giữ deep-link khi user share/reload.
  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);

    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

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




  const summaryText = useMemo(() => {
    const parts: string[] = [];
    parts.push(`${products.length} kết quả`);

    if (onlyOfficial) parts.push('ưu tiên gian hàng chính hãng');
    if (sortBy === 'best-price') parts.push('sắp theo giá tốt nhất');
    else if (sortBy === 'rating') parts.push('sắp theo đánh giá cao');
    else parts.push('sắp theo nhiều review');
    return parts.join(' · ');
  }, [products.length, onlyOfficial, sortBy]);

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
          {products.map(product => <ProductCompareCard key={product.id} product={product} />)}
        </section>
      </main>
    </div>
  );
}