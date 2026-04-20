import { useMemo } from 'react';
import { Bell, MoveUpRight, Trash2, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../components/common/Badge';
import PlatformPill from '../components/common/PlatformPill';
import { mockWishlist } from '../data/mockWishlist';
import { mockProducts } from '../data/mockProducts';
import AppHeader from '../components/layout/AppHeader';

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);

export default function WishlistPage() {
  const wishlistRows = useMemo(() => {
    return mockWishlist
      .map((item) => {
        const product = mockProducts.find((product) => product.id === item.productId);
        const bestOffer = product
          ? [...product.platforms].sort((a, b) => a.finalPrice - b.finalPrice)[0]
          : null;

        return {
          item,
          product,
          bestOffer,
        };
      })
      .filter((row) => row.product && row.bestOffer);
  }, []);

  const summaryText = useMemo(() => {
    const nearTargetCount = mockWishlist.filter((item) => item.nearTarget).length;
    const alertEnabledCount = mockWishlist.filter((item) => item.alertEnabled).length;

    return `${mockWishlist.length} sản phẩm đang được lưu · ${nearTargetCount} món đã tiến gần vùng giá bạn quan tâm · ${alertEnabledCount} món đã bật alert.`;
  }, []);

  return (
    <div
      className="min-h-screen bg-[#FCF8F4] text-[#241B17]"
      style={{ fontFamily: FONT_STACK.sans }}
    >
      <div className="pointer-events-none fixed left-[-10%] top-[-12%] h-[40vw] w-[40vw] rounded-full bg-[#E9DED1] opacity-45 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-6%] h-[30vw] w-[30vw] rounded-full bg-[#EDE3D8] opacity-90 blur-[120px]" />

      <AppHeader currentPage="wishlist" />

      <main className="mx-auto max-w-7xl px-6 pb-36 pt-36 lg:px-12">
        <section className="mb-10">
          <div className="max-w-3xl">
            <h1
              className="text-4xl leading-[1.12] text-[#241B17] md:text-5xl"
              style={{ fontFamily: FONT_STACK.serif }}
            >
              Những món bạn
              <br className="hidden md:block" />
              muốn quay lại.
            </h1>

            <p className="mt-5 text-sm leading-7 text-[#74685F]">
              {summaryText}
            </p>
          </div>
        </section>

        <section className="space-y-6">
          {wishlistRows.map(({ item, product, bestOffer }) => {
            if (!product || !bestOffer) return null;

            return (
              <article
                key={item.id}
                className="rounded-[34px] border border-[#DDD2C6] bg-[#F8F4EE] p-6 shadow-[0_10px_30px_rgba(33,24,19,0.06)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(33,24,19,0.08)]"
              >
                <div className="flex flex-col gap-6 xl:flex-row">
                  <div className="flex gap-5 xl:w-[42%]">
                    <div className="h-36 w-28 shrink-0 overflow-hidden rounded-[26px] bg-[#ECE4DA]">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.nearTarget && (
                          <Badge variant="warning">Đang gần vùng giá đẹp</Badge>
                        )}

                        {item.alertEnabled && (
                          <Badge variant="brand">Đã bật alert</Badge>
                        )}

                        {!product.insight.isFakeDiscountRisk && (
                          <Badge variant="soft">Đáng cân nhắc</Badge>
                        )}
                      </div>

                      <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-[#8D7663]">
                        {product.brand}
                      </p>

                      <h2
                        className="mt-3 text-[1.7rem] leading-[1.2] text-[#241B17]"
                        style={{ fontFamily: FONT_STACK.serif }}
                      >
                        {product.name}
                      </h2>

                      <p className="mt-4 text-sm leading-7 text-[#74685F]">
                        {item.nearTarget
                          ? 'Sản phẩm này đang tiến gần hơn tới mức giá bạn có thể cân nhắc mua.'
                          : 'Một lựa chọn đang được lưu lại để theo dõi thêm trước khi ra quyết định.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 space-y-5">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-[24px] border border-[#DDD2C6] bg-[#F3EDE5] p-4">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[#9A8A7A]">
                          Giá đẹp nhất hiện tại
                        </p>
                        <p className="mt-3 text-lg font-semibold text-[#241B17]">
                          {formatPrice(bestOffer.finalPrice)}
                        </p>
                      </div>

                      <div className="rounded-[24px] border border-[#DDD2C6] bg-[#F3EDE5] p-4">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[#9A8A7A]">
                          Nơi mua phù hợp nhất
                        </p>
                        <div className="mt-3">
                          <PlatformPill platform={bestOffer.platform} compact />
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-[#DDD2C6] bg-[#F3EDE5] p-4">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[#9A8A7A]">
                          Biến động 7 ngày
                        </p>
                        <p className="mt-3 inline-flex items-center gap-2 text-lg font-semibold text-[#241B17]">
                          <TrendingDown size={16} className="text-[#7A5D49]" />
                          {item.priceChanged7dPercent}%
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[26px] bg-[#F3EDE5] p-5">
                      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#9A8A7A]">
                            Theo dõi hiện tại
                          </p>

                          <p className="mt-3 text-sm leading-7 text-[#74685F]">
                            {item.alertEnabled
                              ? 'Alert vẫn đang sẵn sàng để nhắc bạn khi mức giá phù hợp hơn xuất hiện.'
                              : 'Bạn có thể bật alert bất cứ lúc nào nếu muốn quay lại đúng thời điểm đẹp hơn.'}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Link
                            to={`/product/${product.id}`}
                            className="inline-flex items-center gap-2 rounded-full border border-[#2A211D] bg-[#2A211D] px-5 py-3 text-sm font-medium text-[#F6F1EA] transition hover:border-[#3A2D28] hover:bg-[#3A2D28]"
                          >
                            Xem chi tiết
                            <MoveUpRight size={15} />
                          </Link>

                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-full border border-[#D1C3B4] bg-transparent px-4 py-3 text-sm font-medium text-[#584B43] transition hover:border-[#2A211D] hover:text-[#201915]"
                          >
                            <Bell size={15} />
                            {item.alertEnabled ? 'Chỉnh alert' : 'Bật alert'}
                          </button>

                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-full px-3 py-3 text-sm font-medium text-[#8D7B6D] transition hover:text-[#644D41]"
                          >
                            <Trash2 size={15} />
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}