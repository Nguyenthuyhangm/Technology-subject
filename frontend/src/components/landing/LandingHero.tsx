import heroProduct from '../../assets/landing/hero-product.png'
import product1 from '../../assets/landing/product-1.png'
import product2 from '../../assets/landing/product-2.png'
import type { LandingDeal } from '../../hooks/useLandingDeals'

interface LandingHeroProps {
  deals: LandingDeal[]
}

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const

export function LandingHero({ deals }: LandingHeroProps) {
  const firstDeal = deals[0]

  return (
    <section className="mx-auto grid max-w-7xl gap-12 px-6 pt-8 pb-24 lg:grid-cols-2 lg:items-center lg:px-12">
      <div>
        <h1
          className="text-5xl leading-[0.98] tracking-[-0.03em] text-stone-900 md:text-6xl lg:text-7xl"
          style={{ fontFamily: FONT_STACK.serif }}
        >
          Mua sắm tinh tế,
          <br />
          thấy đúng <span className="italic text-[#B7848C]">giá đẹp.</span>
        </h1>

        <p className="mt-6 max-w-md text-base leading-8 text-stone-500">
          PriceHawk giúp bạn theo dõi giá mỹ phẩm trên nhiều sàn, nhận biết
          thời điểm nên mua và chọn nơi có mức giá tối ưu hơn.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="#deals"
            className="rounded-full bg-[#B7848C] px-7 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Buy Now
          </a>
          <a
            href="#deals"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#B7848C] text-white transition-opacity hover:opacity-90"
            aria-label="Scroll to deals"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </div>
      </div>

      <div className="relative">
        <div className="relative mx-auto aspect-square w-full max-w-lg">
          <div className="absolute inset-0 rounded-t-full bg-gradient-to-b from-[#F7ECEE]/60 to-[#F4EEE7]/20" />

          <img
            src={heroProduct}
            alt="Mỹ phẩm nổi bật"
            className="relative h-full w-full rounded-t-full object-cover"
          />

          <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-4 py-2 text-xs shadow-lg backdrop-blur-sm">
            <span className="text-stone-500">Giá tốt nhất </span>
            <span className="font-semibold text-[#B7848C]">
              {firstDeal?.discountLabel ?? 'hôm nay'}
            </span>
          </div>

          <div className="absolute -right-6 top-12 h-28 w-28 rounded-full bg-[#f2f2f2] p-3 shadow-xl">
            <img
              src={product1}
              alt="Sản phẩm mỹ phẩm"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="absolute -right-10 bottom-20 h-32 w-32 rounded-full bg-[#f2f2f2] p-3 shadow-xl">
            <img
              src={product2}
              alt="Sản phẩm mỹ phẩm"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="absolute -bottom-2 right-4 flex items-center gap-3 rounded-2xl bg-white/70 p-4 shadow-xl backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7ECEE]">
              <svg
                className="h-5 w-5 text-[#B7848C]"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>

            <div className="text-xs">
              <div className="text-stone-500">
                Giá tốt nhất hôm nay
              </div>
              <div className="font-semibold text-[#B7848C]">
                {firstDeal?.priceLabel ?? 'Đang cập nhật'}
                {firstDeal?.discountLabel && (
                  <span className="ml-1 text-[10px] text-emerald-600">
                    {firstDeal.discountLabel}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-stone-500">
                {firstDeal?.storeName ?? 'PriceHawk'} · Còn hàng
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
