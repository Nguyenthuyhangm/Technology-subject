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

// VALUE phải khớp DB/API để FE compare đúng.
const PLATFORM_OPTIONS: PlatformName[] = ['Cocolux', 'guardian', 'Hasaki'];

const promotionOptions = [
  { id: 'all', name: 'Tất cả' },
  { id: 'sale', name: 'Đang giảm giá' },
  { id: 'flash_sale', name: 'Flash Sale' },
] as const;

const SKINCARE_SLUGS = [
  'kem-chống-nắng', 'kem-chong-nang',
  'serum',
  'sữa-rửa-mặt', 'sua-rua-mat',
  'toner',
  'kem-dưỡng', 'kem-duong',
  'mặt-nạ', 'mat-na',
  'tẩy-da-chết',
  'dưỡng-thể',
  'sữa-tắm',
] as const;

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
  'nước-hoa',
] as const;

const HAIRCARE_SLUGS = [
  'dầu-gội', 'dau-goi',
  'tạo-kiểu-tóc',
  'dầu-xả',
  'dưỡng-tóc',
] as const;

type CategoryItem = {
  id: string | number;
  name: string;
  slug: string;
};

function formatPlatformLabel(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

/**
 * Đồng bộ state:
 * - queryDraft: text user đang gõ
 * - query: keyword đã debounce / dùng để fetch thật
 * - selectedPlatforms rỗng = tất cả sàn
 * - URL sync với q + platform + category + promo
 */
export default function SearchResultsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = searchParams.get('q') ?? '';
  const initialPlatforms = searchParams.getAll('platform') as PlatformName[];
  const initialCategory = searchParams.get('category') ?? (slug ?? 'all');
  const initialPromo = searchParams.get('promo') ?? 'all';
  const initialOfficial = searchParams.get('official') === 'true';
  const initialSort =
    (searchParams.get('sort') as 'best-price' | 'rating' | 'reviews' | null) ?? 'best-price';

  const [queryDraft, setQueryDraft] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);

  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformName>>(
    () => new Set(initialPlatforms),
  );
  const [onlyOfficial, setOnlyOfficial] = useState(initialOfficial);
  const [sortBy, setSortBy] = useState<'best-price' | 'rating' | 'reviews'>(initialSort);
  const [products, setProducts] = useState<ProductSearch[]>([]);
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [selectedPromo, setSelectedPromo] = useState<string>(initialPromo);

  // Debounce gõ tìm kiếm để giảm lag.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryDraft.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [queryDraft]);

  // Đồng bộ từ URL -> state nếu user back/forward hoặc link ngoài.
  useEffect(() => {
    const nextQuery = searchParams.get('q') ?? '';
    const nextPlatforms = new Set(searchParams.getAll('platform') as PlatformName[]);
    const nextCategory = searchParams.get('category') ?? (slug ?? 'all');
    const nextPromo = searchParams.get('promo') ?? 'all';
    const nextOfficial = searchParams.get('official') === 'true';
    const nextSort =
      (searchParams.get('sort') as 'best-price' | 'rating' | 'reviews' | null) ?? 'best-price';

    if (nextQuery !== queryDraft) setQueryDraft(nextQuery);
    if (nextQuery !== query) setQuery(nextQuery);
    if (!setsEqual(selectedPlatforms, nextPlatforms)) setSelectedPlatforms(nextPlatforms);
    if (selectedCategory !== nextCategory) setSelectedCategory(nextCategory);
    if (selectedPromo !== nextPromo) setSelectedPromo(nextPromo);
    if (onlyOfficial !== nextOfficial) setOnlyOfficial(nextOfficial);
    if (sortBy !== nextSort) setSortBy(nextSort);
  }, [searchParams, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load category 1 lần.
  useEffect(() => {
    let cancelled = false;

    fetch('http://localhost:8080/api/categories/all')
      .then((res) => res.json())
      .then((data: CategoryItem[]) => {
        if (!cancelled) setCategories(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[SearchResultsPage] load categories failed:', err);
          setCategories([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPlatformsArr = useMemo(
    () => Array.from(selectedPlatforms).sort(),
    [selectedPlatforms],
  );
  const platformsKey = selectedPlatformsArr.join(',');

  // Group category để render select nhẹ hơn.
  const groupedCategories = useMemo(() => {
    const skincare = categories.filter((c) => SKINCARE_SLUGS.includes(c.slug as never));
    const makeup = categories.filter((c) => MAKEUP_SLUGS.includes(c.slug as never));
    const haircare = categories.filter((c) => HAIRCARE_SLUGS.includes(c.slug as never));
    const other = categories.filter(
      (c) =>
        !SKINCARE_SLUGS.includes(c.slug as never) &&
        !MAKEUP_SLUGS.includes(c.slug as never) &&
        !HAIRCARE_SLUGS.includes(c.slug as never),
    );

    return { skincare, makeup, haircare, other };
  }, [categories]);

  // Đồng bộ filter lên URL, giữ deep-link/share/reload.
  useEffect(() => {
    const next = new URLSearchParams();

    if (query) next.set('q', query);
    if (selectedCategory !== 'all') next.set('category', selectedCategory);
    if (selectedPromo !== 'all') next.set('promo', selectedPromo);
    if (onlyOfficial) next.set('official', 'true');
    if (sortBy !== 'best-price') next.set('sort', sortBy);

    for (const p of selectedPlatformsArr) {
      next.append('platform', p);
    }

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [
    query,
    selectedCategory,
    selectedPromo,
    onlyOfficial,
    sortBy,
    platformsKey,
    selectedPlatformsArr,
    searchParams,
    setSearchParams,
  ]);

  // Fetch dữ liệu.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);

      try {
        let data: ProductSearch[] = [];

        const hasKeyword = Boolean(query);
        const hasCategory = selectedCategory !== 'all';
        const effectiveCategory = hasCategory ? selectedCategory : slug;

        if (hasKeyword) {
          // Giữ logic search hiện có, đồng thời truyền thêm filter nếu service hỗ trợ.
          data = await searchProducts(query, {
            platforms: selectedPlatformsArr,
            category: effectiveCategory,
            promotion: selectedPromo !== 'all' ? selectedPromo : undefined,
            officialOnly: onlyOfficial,
            sortBy,
          } as any);
        } else if (effectiveCategory) {
          data = await getProductsByCategory(effectiveCategory);
        } else {
          data = [];
        }

        if (cancelled) return;

        // FE fallback filter nếu BE chưa hỗ trợ hết.
        let filtered = Array.isArray(data) ? data : [];

        if (selectedPlatformsArr.length > 0) {
          filtered = filtered.filter((product: any) =>
            selectedPlatformsArr.includes(product.platform?.name ?? product.platform),
          );
        }

        if (selectedPromo !== 'all') {
          filtered = filtered.filter((product: any) => {
            if (selectedPromo === 'sale') {
              return Boolean(product.discountPercent || product.salePrice || product.originalPrice > product.price);
            }
            if (selectedPromo === 'flash_sale') {
              return Boolean(product.isFlashSale || product.flashSale);
            }
            return true;
          });
        }

        if (onlyOfficial) {
          filtered = filtered.filter((product: any) =>
            Boolean(
              product.isOfficial ??
              product.official ??
              product.shop?.isOfficial ??
              product.store?.isOfficial,
            ),
          );
        }

        if (sortBy === 'best-price') {
          filtered = [...filtered].sort((a: any, b: any) => (a.price ?? Infinity) - (b.price ?? Infinity));
        } else if (sortBy === 'rating') {
          filtered = [...filtered].sort((a: any, b: any) => (b.rating ?? 0) - (a.rating ?? 0));
        } else {
          filtered = [...filtered].sort((a: any, b: any) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
        }

        setProducts(filtered);
      } catch (err) {
        if (!cancelled) {
          console.error('[SearchResultsPage] fetch products failed:', err);
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [query, slug, selectedCategory, selectedPromo, onlyOfficial, sortBy, platformsKey, selectedPlatformsArr]);

  const onSubmitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = queryDraft.trim();
    setQuery(trimmed);

    if (slug && trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
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

    if (selectedCategory !== 'all') {
      const foundCategory = categories.find((c) => c.slug === selectedCategory);
      if (foundCategory) parts.push(`danh mục: ${foundCategory.name}`);
    }

    if (selectedPromo !== 'all') {
      parts.push(`loại: ${promotionOptions.find((p) => p.id === selectedPromo)?.name}`);
    }

    if (onlyOfficial) parts.push('ưu tiên gian hàng chính hãng');
    if (sortBy === 'best-price') parts.push('sắp theo giá tốt nhất');
    else if (sortBy === 'rating') parts.push('sắp theo đánh giá cao');
    else parts.push('sắp theo nhiều review');

    return parts.join(' · ');
  }, [
    products.length,
    isAllSelected,
    selectedPlatformsArr,
    selectedCategory,
    categories,
    selectedPromo,
    onlyOfficial,
    sortBy,
  ]);

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
                  value={queryDraft}
                  onChange={(e) => setQueryDraft(e.target.value)}
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
                <button
                  type="button"
                  onClick={clearPlatforms}
                  aria-pressed={isAllSelected}
                  className={`rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.06em] transition ${
                    isAllSelected
                      ? 'bg-[#F3EDE5] text-[#2C241F] ring-1 ring-[#DED3C7]'
                      : 'bg-transparent text-stone-500 ring-1 ring-stone-200/70 hover:text-stone-900'
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
                      className={`rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.06em] transition ${
                        active
                          ? 'bg-[#F3EDE5] text-[#2C241F] ring-1 ring-[#DED3C7]'
                          : 'bg-transparent text-stone-500 ring-1 ring-stone-200/70 hover:text-stone-900'
                      }`}
                    >
                      {formatPlatformLabel(item)}
                    </button>
                  );
                })}

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
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-400">Danh mục</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="max-w-[180px] cursor-pointer rounded-full bg-white px-4 py-2.5 text-sm text-stone-700 outline-none ring-1 ring-stone-200/70 transition focus:ring-stone-300"
                  >
                    <option value="all">Tất cả danh mục</option>

                    <optgroup label="🌿 Chăm sóc da">
                      {groupedCategories.skincare.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="💄 Trang điểm">
                      {groupedCategories.makeup.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="💇‍♀️ Chăm sóc tóc">
                      {groupedCategories.haircare.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                    </optgroup>

                    <optgroup label="📦 Khác">
                      {groupedCategories.other.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-400">Sắp xếp theo</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'best-price' | 'rating' | 'reviews')}
                    className="cursor-pointer rounded-full bg-white px-4 py-2.5 text-sm text-stone-700 outline-none ring-1 ring-stone-200/70 transition focus:ring-stone-300"
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
            <div className="rounded-[34px] border border-white/50 bg-white/80 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-md">
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