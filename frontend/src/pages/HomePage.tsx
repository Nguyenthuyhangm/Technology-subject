import React, { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react'; // Đã xóa Loader2 vì không dùng nữa
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import FloatingAIAssistant from '../components/common/FloatingAIAssistant';
import Badge from '../components/common/Badge';
import { mockProducts } from '../data/mockProducts';
import AppHeader from '../components/layout/AppHeader';
import RecommendationSection from '../components/RecommendationSection';
// Đã xóa ProductCard và các selectors liên quan đến deals/highlights

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

const quickKeywords = [
  'Anessa',
  'Laneige',
  'Kem chống nắng',
  'Serum niacinamide',
];

const categories = [
  {
    title: 'Make Up',
    subtitle:
      'Son môi, kem nền, phấn phủ và mỹ phẩm nổi bật đang có mức giá đáng cân nhắc.',
    to: '/search?q=Mỹ phẩm',
  },
  {
    title: 'Skin Care',
    subtitle:
      'Sữa rửa mặt, serum, kem dưỡng và sản phẩm chăm da được chọn lọc giá tốt.',
    to: '/search?q=Chăm sóc da',
  },
  {
    title: 'Hair Care',
    subtitle:
      'Dầu gội, dầu xả, tinh chất và sản phẩm chăm tóc giúp bạn dễ dàng lựa chọn.',
    to: '/search?q=Chăm sóc tóc',
  },
];

type AuthUserLike = {
  id?: string | null;
};

type AuthContextLike = {
  user?: AuthUserLike | null;
  profile?: AuthUserLike | null;
  backendUser?: AuthUserLike | null;
  userProfile?: AuthUserLike | null;
};

export default function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const auth = useAuth() as AuthContextLike;

  const currentUserId =
    auth.profile?.id ??
    auth.backendUser?.id ??
    auth.userProfile?.id ??
    auth.user?.id ??
    localStorage.getItem('userId') ??
    null;

  const curatedProducts = useMemo(() => {
    return mockProducts.filter(
      (product) =>
        !product.insight.isFakeDiscountRisk &&
        (product.insight.isLowest30Days ||
          product.insight.isLowest90Days ||
          product.insight.lowerThanAvg30dPercent >= 10),
    );
  }, []);

  const featuredProduct = useMemo(() => {
    return curatedProducts[0] ?? mockProducts[0];
  }, [curatedProducts]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = query.trim();
    if (!normalized) return;
    navigate(`/search?q=${encodeURIComponent(normalized)}`);
  };

  const handleQuickSearch = (keyword: string) => {
    setQuery(keyword);
    navigate(`/search?q=${encodeURIComponent(keyword)}`);
  };

  return (
    <div
      className="min-h-screen bg-[#FCF8F4] text-stone-900 dark:bg-[#0F0D0C] dark:text-stone-100"
      style={{ fontFamily: FONT_STACK.sans }}
    >
      <div className="pointer-events-none fixed left-[-10%] top-[-14%] h-[42vw] w-[42vw] rounded-full bg-[#F7ECEE] opacity-40 blur-[160px] dark:bg-[#2A1F1A]" />
      <div className="pointer-events-none fixed bottom-[-12%] right-[-6%] h-[34vw] w-[34vw] rounded-full bg-[#F4EEE7] opacity-40 blur-[160px] dark:bg-[#1A1F2A]" />

      <AppHeader currentPage="home" />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-36 lg:px-12">
        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-2xl">
            <h1
              className="mt-4 text-6xl leading-[0.98] tracking-[-0.03em] text-stone-900 dark:text-stone-100 md:text-7xl xl:text-[5.6rem]"
              style={{ fontFamily: FONT_STACK.serif }}
            >
              Mua sắm tinh tế,
              <br />
              thấy đúng <span className="text-[#B7848C]">giá đẹp</span>.
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-8 text-stone-500">
              PriceHawk giúp bạn theo dõi mức giá trên nhiều sàn, nhận ra thời điểm
              nên mua và chọn nơi thanh toán tối ưu hơn — theo cách nhẹ nhàng,
              rõ ràng và đáng tin cậy.
            </p>

            <form
              onSubmit={handleSearchSubmit}
              className="mt-9 rounded-[34px] border border-white/50 bg-white/80 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-md dark:border-stone-700/50 dark:bg-[#1A1614]/80"
            >
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm một món bạn đang cân nhắc..."
                    className="w-full rounded-full border border-white/50 bg-white/80 py-4 pl-12 pr-5 text-sm text-stone-900 outline-none backdrop-blur-md transition focus:border-[#D8C1C6] dark:border-stone-700/40 dark:bg-stone-900/70 dark:text-stone-100"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-full bg-[#1F1A17] px-6 py-4 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Tìm và so sánh
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/50 pt-4 dark:border-stone-700/30">
                {quickKeywords.map((keyword) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => handleQuickSearch(keyword)}
                    className="rounded-full border border-white/40 bg-white/60 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-stone-500 backdrop-blur-sm transition hover:text-stone-900 dark:border-stone-700/40 dark:bg-stone-800/40 dark:text-stone-400 dark:hover:text-stone-100"
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </form>
          </div>

          <div className="rounded-[36px] border border-white/50 bg-white/70 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)] backdrop-blur-xl dark:border-stone-700/30 dark:bg-[#1A1614]/70">
            <div className="relative overflow-hidden rounded-[28px] bg-[#F5EEE8]">
              <img
                src={featuredProduct.images[0]}
                alt={featuredProduct.name}
                className="aspect-[4/4.6] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />
            </div>

            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="brand">Lựa chọn nổi bật</Badge>
                {!featuredProduct.insight.isFakeDiscountRisk && (
                  <Badge variant="soft">Đáng cân nhắc hôm nay</Badge>
                )}
              </div>
              <p className="mt-4 text-[10px] uppercase tracking-[0.12em] text-[#8E6A72]">
                {featuredProduct.brand}
              </p>
              <h2
                className="mt-3 text-3xl leading-[1.14] tracking-[-0.02em] text-stone-900 dark:text-stone-100"
                style={{ fontFamily: FONT_STACK.serif }}
              >
                {featuredProduct.name}
              </h2>
              <p className="mt-4 text-sm leading-7 text-stone-500 dark:text-stone-400">
                {featuredProduct.insight.summary}
              </p>
              <Link
                to={`/product/${featuredProduct.id}`}
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-stone-700 transition hover:text-[#8E6A72] dark:text-stone-300"
              >
                Xem chi tiết
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* --- PHẦN GIÁ ĐẸP ĐÃ ĐƯỢC XÓA TẠI ĐÂY --- */}

        <section className="mt-20">
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8E6A72]">
              Khám phá nhanh
            </p>
            <h2
              className="mt-2 text-3xl tracking-[-0.02em] text-stone-900 dark:text-stone-100 md:text-4xl"
              style={{ fontFamily: FONT_STACK.serif }}
            >
              Mua sắm theo nhóm bạn quan tâm
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.title}
                to={category.to}
                className="rounded-[28px] border border-stone-200/80 bg-white/80 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.06)] dark:border-stone-700/40 dark:bg-[#1A1614]/80"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#8E6A72]">
                  Danh mục
                </p>
                <h3
                  className="mt-3 text-[1.7rem] leading-[1.12] tracking-[-0.02em] text-stone-900 dark:text-stone-100"
                  style={{ fontFamily: FONT_STACK.serif }}
                >
                  {category.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-stone-500 dark:text-stone-400">
                  {category.subtitle}
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-stone-700 transition hover:text-[#8E6A72] dark:text-stone-300">
                  Xem sản phẩm
                  <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {currentUserId && <RecommendationSection userId={currentUserId} />}

        <section className="mt-20 rounded-[38px] border border-stone-200/80 bg-white p-8 shadow-[0_18px_45px_rgba(15,23,42,0.04)] dark:border-stone-700/40 dark:bg-[#1A1614] md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8E6A72]">
                Save for later
              </p>
              <h2
                className="mt-2 text-3xl leading-[1.16] tracking-[-0.02em] text-stone-900 dark:text-stone-100 md:text-4xl"
                style={{ fontFamily: FONT_STACK.serif }}
              >
                Lưu wishlist, đặt alert,
                <br className="hidden md:block" />
                quay lại đúng lúc.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-500 dark:text-stone-400">
                Khi chưa muốn mua ngay, bạn có thể lưu lại sản phẩm đang cân nhắc
                hoặc đặt cảnh báo để không bỏ lỡ mức giá đẹp hơn.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                to="/wishlist"
                className="inline-flex items-center justify-center rounded-full bg-[#1F1A17] px-6 py-4 text-sm font-medium text-white transition hover:opacity-90"
              >
                Mở Wishlist
              </Link>
              <Link
                to="/alerts"
                className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-[#F8F3EE] px-6 py-4 text-sm font-medium text-stone-700 transition hover:text-[#8E6A72] dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
              >
                Mở Alerts
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-24 border-t border-stone-200/70 bg-white/60 pb-12 pt-16 backdrop-blur-xl dark:border-stone-700/40 dark:bg-[#1A1614]/60">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 md:grid-cols-3 lg:px-12">
          <div className="space-y-4">
            <div
              className="text-[2rem] text-stone-900 dark:text-stone-100"
              style={{ fontFamily: FONT_STACK.serif }}
            >
              Price<span className="text-[#B7848C]">Hawk</span>
            </div>
            <p className="max-w-xs text-sm leading-7 text-stone-500 dark:text-stone-400">
              So sánh giá theo cách tinh tế hơn, rõ ràng hơn và phù hợp với quyết
              định mua sắm hằng ngày.
            </p>
          </div>

          <div className="col-span-1 grid grid-cols-2 gap-10 md:col-span-2 md:grid-cols-3">
            <div className="space-y-4">
              <h5 className="text-sm text-stone-900 dark:text-stone-100">
                Khám phá
              </h5>
              <ul className="space-y-3 text-sm text-stone-500 dark:text-stone-400">
                <li>
                  <Link to="/search" className="hover:text-stone-900 dark:hover:text-stone-100">
                    So sánh giá
                  </Link>
                </li>
                <li>
                  <Link to="/deals" className="hover:text-stone-900 dark:hover:text-stone-100">
                    Chọn lọc hôm nay
                  </Link>
                </li>
                <li>
                  <Link to="/wishlist" className="hover:text-stone-900 dark:hover:text-stone-100">
                    Wishlist
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h5 className="text-sm text-stone-900 dark:text-stone-100">
                PriceHawk
              </h5>
              <ul className="space-y-3 text-sm text-stone-500 dark:text-stone-400">
                <li className="cursor-pointer hover:text-stone-900 dark:hover:text-stone-100">
                  Về chúng tôi
                </li>
                <li className="cursor-pointer hover:text-stone-900 dark:hover:text-stone-100">
                  Bảo mật
                </li>
                <li className="cursor-pointer hover:text-stone-900 dark:hover:text-stone-100">
                  Liên hệ
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h5 className="text-sm text-stone-900 dark:text-stone-100">
                Danh mục
              </h5>
              <ul className="space-y-3 text-sm text-stone-500 dark:text-stone-400">
                <li className="cursor-pointer hover:text-stone-900 dark:hover:text-stone-100">
                  Mỹ phẩm
                </li>
                <li className="cursor-pointer hover:text-stone-900 dark:hover:text-stone-100">
                  Chăm sóc da
                </li>
                <li className="cursor-pointer hover:text-stone-900 dark:hover:text-stone-100">
                  Chăm sóc tóc
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-stone-200/70 px-6 pt-6 text-xs text-stone-400 md:flex-row lg:px-12">
          <span>© 2026 PriceHawk. Smart shopping, quietly curated.</span>
          <div className="flex gap-6">
            <span>Instagram</span>
            <span>Behance</span>
          </div>
        </div>
      </footer>

      <FloatingAIAssistant userId={currentUserId ?? undefined} />
    </div>
  );
}