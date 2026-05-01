import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import ProductCompareCard from '../components/product/ProductCompareCard';
import TrendingDealsSection from '../components/deals/TrendingDealsSection';
import AppHeader from '../components/layout/AppHeader';
import { useTrendingDeals } from '../util/useTrendingDeals';
import {
  isDealOlderThanDays,
  sortByDealScoreDesc,
  sortByDiscountPercentDesc,
  trendingDealToProductSearch,
} from '../util/trendingDealSelectors';
const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;
type DealTab = 'all' | 'today' | 'worthy' | 'watch';

const tabOptions: Array<{ id: DealTab; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'today', label: 'Hôm nay' },
  { id: 'worthy', label: 'Đáng mua' },
  { id: 'watch', label: 'Theo dõi thêm' },
];

export default function DealsPage() {
  const [activeTab, setActiveTab] = useState<DealTab>('all');
  const { deals, loading, error } = useTrendingDeals();

  const mappedSections = useMemo(() => {
    const list = deals ?? [];
    if (list.length === 0) return [];

    const byDealScore = [...list].sort(sortByDealScoreDesc);
    const byDiscount = [...list].sort(sortByDiscountPercentDesc);
    const stale = byDealScore.find((d) => isDealOlderThanDays(d, 7)) ?? null;

    const sections = [
      {
        id: 'trending-dealscore-top',
        type: 'trending',
        products: byDealScore.slice(0, 1).map(trendingDealToProductSearch),
      },
      {
        id: 'deal-discount-top',
        type: 'real-discount',
        products: byDiscount.slice(0, 1).map(trendingDealToProductSearch),
      },
      {
        id: 'deal-stale-observe',
        type: 'suspicious-discount',
        products: (stale ? [stale] : byDealScore.slice(0, 1)).map(trendingDealToProductSearch),
      },
    ];

    return sections.filter((s) => s.products.length > 0);
  }, [deals]);

  const filteredSections = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'today') {
      return mappedSections;
    }

    if (activeTab === 'worthy') {
      return mappedSections.filter((section) => section.type === 'real-discount');
    }

    if (activeTab === 'watch') {
      return mappedSections.filter((section) => section.type === 'suspicious-discount');
    }

    return mappedSections;
  }, [activeTab, mappedSections]);

  const summaryText = useMemo(() => {
    const totalDeals = (deals ?? []).length;

    if (activeTab === 'worthy') {
      return 'Đang chọn món có mức giảm tốt nhất so với giá gốc hiện tại.';
    }

    if (activeTab === 'watch') {
      return 'Đang chọn món có dealScore cao nhưng dữ liệu cập nhật đã lâu (quá 7 ngày).';
    }

    return `${totalDeals} lựa chọn được chọn lọc từ tín hiệu giá hiện tại, lịch sử gần đây và độ ổn định của mức giảm.`;
  }, [activeTab, deals]);

  const sectionMeta = (type: string) => {
    if (type === 'trending') {
      return {
        eyebrow: 'Chọn lọc hôm nay',
        title: 'Những món đang được quan tâm nhiều',
        subtitle:
          'Các sản phẩm nổi bật ở thời điểm hiện tại, phù hợp để xem nhanh và so sánh ngay.',
      };
    }

    if (type === 'real-discount') {
      return {
        eyebrow: 'Đáng mua',
        title: 'Đang ở vùng giá đẹp',
        subtitle:
          'Những món có tín hiệu giá tốt hơn so với lịch sử gần đây và dễ ra quyết định hơn.',
      };
    }

    if (type === 'suspicious-discount') {
      return {
        eyebrow: 'Theo dõi thêm',
        title: 'Cần quan sát kỹ hơn',
        subtitle:
          'Một số mức giảm trông hấp dẫn, nhưng vẫn nên xem thêm lịch sử giá trước khi mua.',
      };
    }

    return {
      eyebrow: 'Curated selection',
      title: 'Những lựa chọn đáng cân nhắc',
      subtitle:
        'Danh sách được chọn lọc theo tín hiệu giá và mức độ phù hợp với nhu cầu mua sắm hiện tại.',
    };
  };

  return (
    <div
      className="min-h-screen bg-[#FCF8F4] text-stone-900"
      style={{ fontFamily: FONT_STACK.sans }}
    >
      <div className="pointer-events-none fixed left-[-10%] top-[-12%] h-[40vw] w-[40vw] rounded-full bg-[#F7ECEE] opacity-30 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-6%] h-[30vw] w-[30vw] rounded-full bg-[#F4EEE7] opacity-90 blur-[120px]" />

     <AppHeader currentPage="deals" />

<main className="mx-auto max-w-7xl px-6 pb-20 pt-36 lg:px-12">
        <TrendingDealsSection />

        <section className="mb-10">
          <div className="max-w-3xl">
            

            <h1
              className="text-4xl leading-[1.12] text-stone-900 md:text-5xl"
              style={{ fontFamily: FONT_STACK.serif }}
            >
              Những lựa chọn đáng cân nhắc
              <br className="hidden md:block" />
              tại thời điểm hiện tại.
            </h1>

           

            <p className="mt-5 text-sm leading-7 text-stone-500">
              {summaryText}
            </p>
          </div>
        </section>

        <section className="mb-12 rounded-[34px] border border-stone-200/80  p-4 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap gap-2">
            {tabOptions.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
               <button
  key={tab.id}
  type="button"
  onClick={() => setActiveTab(tab.id)}
  className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-[11px] font-medium tracking-[0.06em] transition-all duration-300 ${
    isActive
      ? 'bg-[#F3EDE5] text-[#2C241F] ring-1 ring-[#DED3C7]'
      : 'bg-transparent text-stone-500 ring-1 ring-stone-200/70 hover:text-stone-900 hover:bg-[#F6F1EA]'
  }`}
>
  {tab.label}
</button>
              );
            })}
          </div>
        </section>

        <div className="space-y-16">
          {filteredSections.map((section) => {
            const meta = sectionMeta(section.type);

            return (
              <section key={section.id}>
                <div className="mb-7 max-w-3xl">
                  <p className="text-[11px] uppercase tracking-normal text-[#8E6A72]">
                    {meta.eyebrow}
                  </p>

                  <h2
                    className="mt-3 text-3xl leading-[1.18] text-stone-900 md:text-4xl"
                    style={{ fontFamily: FONT_STACK.serif }}
                  >
                    {meta.title}
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-stone-500">
                    {meta.subtitle}
                  </p>
                </div>

                <div className="space-y-6">
                  {section.products.map((product) => (
                    <ProductCompareCard
                      key={product.id}
                      product={product}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {filteredSections.length === 0 && (
            <div className="rounded-[34px] border border-stone-200/80 bg-white p-10 text-center shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
              {loading ? (
                <p className="flex items-center justify-center gap-2 text-sm text-stone-500">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  <span>Đang tải </span>
                </p>
              ) : error ? (
                <p className="text-sm leading-7 text-stone-500">
                  Không tìm thấy sản phẩm phù hợp
                </p>
              ) : (
                <>
                  <p className="text-[11px] uppercase tracking-normal text-[#8E6A72]">
                    Không có lựa chọn phù hợp
                  </p>

                  <h2
                    className="mt-3 text-3xl text-stone-900"
                    style={{ fontFamily: FONT_STACK.serif }}
                  >
                    Chưa có deal khớp với bộ lọc này
                  </h2>

                  <p className="mt-4 text-sm leading-7 text-stone-500">
                    Thử chuyển sang nhóm khác để xem thêm những lựa chọn đang có tín hiệu giá đẹp
                    hơn.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}