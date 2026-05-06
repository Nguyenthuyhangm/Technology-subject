import { useMemo, useState, useEffect, useCallback } from 'react';
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

const PLATFORM_OPTIONS: PlatformName[] = ['Cocolux', 'guardian', 'Hasaki'];

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
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- 1. Derived State từ URL (Single Source of Truth) ---
  const query = searchParams.get('q') ?? '';
  const selectedPlatformsArr = useMemo(() => searchParams.getAll('platform') as PlatformName[], [searchParams]);
  const selectedCategory = searchParams.get('category') ?? (slug ?? 'all');
  const selectedPromo = searchParams.get('promo') ?? 'all';
  const onlyOfficial = searchParams.get('official') === 'true';
  const sortBy = (searchParams.get('sort') as 'best-price' | 'rating' | 'reviews') ?? 'best-price';

  // State cục bộ cho input để gõ mượt
  const [queryDraft, setQueryDraft] = useState(query);
  const [products, setProducts] = useState<ProductSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // --- 2. HÀM CẬP NHẬT URL (Dùng chung) ---
  const updateFilters = useCallback((updates: Record<string, string | string[] | boolean | undefined>) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === 'all' || value === false || value === '') {
        next.delete(key);
      } else if (Array.isArray(value)) {
        next.delete(key);
        value.forEach(v => next.append(key, v));
      } else {
        next.set(key, String(value));
      }
    });

    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // --- 3. EFFECTS ---

  // Đồng bộ queryDraft khi query từ URL thay đổi (nhấn Back/Forward)
  useEffect(() => {
    setQueryDraft(query);
  }, [query]);

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      if (queryDraft.trim() !== query) {
        updateFilters({ q: queryDraft.trim() });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [queryDraft, query, updateFilters]);

  // Load categories (1 lần duy nhất)
  useEffect(() => {
    fetch('http://localhost:8080/api/categories/all')
      .then(res => res.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  // FETCH DỮ LIỆU CHÍNH: Chỉ chạy khi URL Params thay đổi
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        let data: ProductSearch[] = [];
        const effectiveCategory = selectedCategory !== 'all' ? selectedCategory : slug;

        if (query) {
          data = await searchProducts(query, {
            platforms: selectedPlatformsArr,
            category: effectiveCategory,
            promotion: selectedPromo !== 'all' ? selectedPromo : undefined,
            officialOnly: onlyOfficial,
            sortBy,
          } as any);
        } else if (effectiveCategory) {
          data = await getProductsByCategory(effectiveCategory);
        }

        if (cancelled) return;

        // FE Filter Fallback
        let filtered = Array.isArray(data) ? [...data] : [];

        if (selectedPlatformsArr.length > 0) {
          filtered = filtered.filter((p: any) =>
            selectedPlatformsArr.includes(p.platform?.name ?? p.platform)
          );
        }

        if (selectedPromo !== 'all') {
          filtered = filtered.filter((p: any) => {
            if (selectedPromo === 'sale') return p.discountPercent > 0 || p.salePrice < p.originalPrice;
            if (selectedPromo === 'flash_sale') return !!p.isFlashSale;
            return true;
          });
        }

        if (onlyOfficial) {
          filtered = filtered.filter((p: any) => p.isOfficial || p.shop?.isOfficial);
        }

        // Sorting
        filtered.sort((a: any, b: any) => {
          if (sortBy === 'best-price') return (a.price ?? 0) - (b.price ?? 0);
          if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
          return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
        });

        setProducts(filtered);
      } catch (err) {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [query, selectedCategory, selectedPromo, onlyOfficial, sortBy, selectedPlatformsArr, slug]);

  // --- 4. EVENT HANDLERS ---
  const togglePlatform = (name: PlatformName) => {
    const next = new Set(selectedPlatformsArr);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    updateFilters({ platform: Array.from(next) });
  };

  const groupedCategories = useMemo(() => ({
    skincare: categories.filter(c => SKINCARE_SLUGS.includes(c.slug as any)),
    makeup: categories.filter(c => MAKEUP_SLUGS.includes(c.slug as any)),
    haircare: categories.filter(c => HAIRCARE_SLUGS.includes(c.slug as any)),
    other: categories.filter(c => ![...SKINCARE_SLUGS, ...MAKEUP_SLUGS, ...HAIRCARE_SLUGS].includes(c.slug as any)),
  }), [categories]);

  const summaryText = `${products.length} kết quả · ${sortBy === 'best-price' ? 'Giá tốt nhất' : sortBy === 'rating' ? 'Đánh giá cao' : 'Nhiều review'}`;

  return (
    <div className="min-h-screen bg-[#FCF8F4] dark:bg-[#0F0D0C] text-stone-900 dark:text-stone-100" style={{ fontFamily: FONT_STACK.sans }}>
      <div className="pointer-events-none fixed left-[-10%] top-[-12%] h-[40vw] w-[40vw] rounded-full bg-[#F7ECEE] dark:bg-[#2A1F1A] opacity-30 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-6%] h-[30vw] w-[30vw] rounded-full bg-[#F4EEE7] dark:bg-[#1A1F2A] opacity-90 blur-[120px]" />

      <AppHeader currentPage="search" />

      <main className="mx-auto max-w-7xl px-6 pb-20 pt-36 lg:px-12">
        <section className="mb-10">
          <h1
            className="mt-3 text-4xl leading-[1.12] text-stone-900 dark:text-stone-100 md:text-5xl"
            style={{ fontFamily: FONT_STACK.serif }}
          >
            Tìm một món bạn đang cân nhắc,<br className="hidden md:block" /> so sánh theo cách nhẹ nhàng hơn.
          </h1>

          <form onSubmit={(e) => e.preventDefault()} className="mt-8 rounded-[32px] border border-stone-200/60 dark:border-stone-700/40 bg-[#FBF8F3] dark:bg-[#1A1614] p-4 shadow-[0_10px_30px_rgba(28,24,20,0.04)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-1 items-center rounded-full bg-white dark:bg-stone-800/60 px-5 py-3.5 ring-1 ring-stone-200/60 dark:ring-stone-700/40">
                <Search className="h-4 w-4 text-stone-400" />
                <input
                  value={queryDraft}
                  onChange={(e) => setQueryDraft(e.target.value)}
                  placeholder="Tìm theo tên sản phẩm, thương hiệu hoặc model"
                  className="ml-3 w-full bg-transparent text-[15px] text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-600"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4 pt-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateFilters({ platform: [] })}
                  aria-pressed={selectedPlatformsArr.length === 0}
                  className={`rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.06em] transition ${
                    selectedPlatformsArr.length === 0
                      ? 'bg-[#F3EDE5] dark:bg-[#2A221A] text-[#2C241F] dark:text-[#E8D5B8] ring-1 ring-[#DED3C7] dark:ring-[#4A3A2A]'
                      : 'bg-transparent text-stone-500 dark:text-stone-400 ring-1 ring-stone-200/70 dark:ring-stone-700/50 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  Tất cả sàn
                </button>

                {PLATFORM_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    aria-pressed={selectedPlatformsArr.includes(p)}
                    className={`rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.06em] transition ${
                      selectedPlatformsArr.includes(p)
                        ? 'bg-[#F3EDE5] dark:bg-[#2A221A] text-[#2C241F] dark:text-[#E8D5B8] ring-1 ring-[#DED3C7] dark:ring-[#4A3A2A]'
                        : 'bg-transparent text-stone-500 dark:text-stone-400 ring-1 ring-stone-200/70 dark:ring-stone-700/50 hover:text-stone-900 dark:hover:text-stone-100'
                    }`}
                  >
                    {formatPlatformLabel(p)}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => updateFilters({ official: !onlyOfficial })}
                  aria-pressed={onlyOfficial}
                  className={`rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.04em] transition ${
                    onlyOfficial
                      ? 'bg-[#F3EDE5] dark:bg-[#2A221A] text-[#2C241F] dark:text-[#E8D5B8] ring-1 ring-[#DED3C7] dark:ring-[#4A3A2A]'
                      : 'bg-transparent text-stone-500 dark:text-stone-400 ring-1 ring-stone-200/70 dark:ring-stone-700/50 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  Official
                </button>

                <select
                  value={selectedCategory}
                  onChange={(e) => updateFilters({ category: e.target.value })}
                  className="rounded-full bg-white dark:bg-stone-800/60 px-4 py-2 text-sm text-stone-700 dark:text-stone-300 ring-1 ring-stone-200/70 dark:ring-stone-700/40 outline-none transition"
                >
                  <option value="all">Tất cả danh mục</option>
                  {Object.entries(groupedCategories).map(([label, list]) => (
                    <optgroup key={label} label={label}>
                      {list.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-stone-400 dark:text-stone-500">Sắp xếp theo</span>
                <select
                  value={sortBy}
                  onChange={(e) => updateFilters({ sort: e.target.value })}
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
            <p className="text-sm leading-7 text-stone-500 dark:text-stone-400">
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
            !loading && (
              <div className="rounded-[34px] border border-white/50 dark:border-stone-700/40 bg-white/80 dark:bg-[#1A1614]/80 p-4 backdrop-blur-md shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <p className="text-[11px] uppercase tracking-normal text-[#8E6A72]">
                  Không có kết quả phù hợp
                </p>
                <h2 className="mt-3 text-3xl text-stone-900 dark:text-stone-100" style={{ fontFamily: FONT_STACK.serif }}>
                  Chưa có lựa chọn đủ phù hợp
                </h2>
                <p className="mt-4 text-sm leading-7 text-stone-500 dark:text-stone-400">
                  Thử từ khóa ngắn hơn hoặc giảm bớt điều kiện lọc để xem thêm sản phẩm phù hợp hơn với nhu cầu của bạn.
                </p>
              </div>
            )
          )}
        </section>
      </main>
    </div>
  );
}