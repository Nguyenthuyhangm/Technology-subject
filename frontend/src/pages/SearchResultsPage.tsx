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
    <div className="min-h-screen bg-[#FCF8F4] text-stone-900" style={{ fontFamily: FONT_STACK.sans }}>
      <AppHeader currentPage="search" />
      <main className="mx-auto max-w-7xl px-6 pb-20 pt-36 lg:px-12">
        <section className="mb-10">
          <h1 className="mt-3 text-4xl leading-[1.12] text-stone-900 md:text-5xl" style={{ fontFamily: FONT_STACK.serif }}>
            Tìm một món bạn đang cân nhắc,<br className="hidden md:block" /> so sánh theo cách nhẹ nhàng hơn.
          </h1>

          <form onSubmit={(e) => e.preventDefault()} className="mt-8 rounded-[32px] border border-stone-200/60 bg-[#FBF8F3] p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-1 items-center rounded-full bg-white px-5 py-3.5 ring-1 ring-stone-200/60">
                <Search className="h-4 w-4 text-stone-400" />
                <input
                  value={queryDraft}
                  onChange={(e) => setQueryDraft(e.target.value)}
                  placeholder="Tìm theo tên sản phẩm..."
                  className="ml-3 w-full bg-transparent outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateFilters({ platform: [] })}
                className={`rounded-full px-4 py-2 text-[11px] font-medium ring-1 ${selectedPlatformsArr.length === 0 ? 'bg-[#F3EDE5] ring-[#DED3C7]' : 'ring-stone-200/70'}`}
              >
                Tất cả sàn
              </button>
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`rounded-full px-4 py-2 text-[11px] font-medium ring-1 ${selectedPlatformsArr.includes(p) ? 'bg-[#F3EDE5] ring-[#DED3C7]' : 'ring-stone-200/70'}`}
                >
                  {formatPlatformLabel(p)}
                </button>
              ))}
              <select
                value={selectedCategory}
                onChange={(e) => updateFilters({ category: e.target.value })}
                className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-stone-200/70 outline-none"
              >
                <option value="all">Tất cả danh mục</option>
                {Object.entries(groupedCategories).map(([label, list]) => (
                  <optgroup key={label} label={label}>
                    {list.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                  </optgroup>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => updateFilters({ sort: e.target.value })}
                className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-stone-200/70 outline-none"
              >
                <option value="best-price">Giá tốt nhất</option>
                <option value="rating">Đánh giá cao</option>
                <option value="reviews">Nhiều review</option>
              </select>
            </div>
          </form>
          <p className="mt-5 text-sm text-stone-500">{loading ? 'Đang tải...' : summaryText}</p>
        </section>

        <section className="space-y-6">
          {products.map(product => <ProductCompareCard key={product.id} product={product} />)}
        </section>
      </main>
    </div>
  );
}