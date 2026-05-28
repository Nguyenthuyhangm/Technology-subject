import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import product1 from '../../assets/landing/product-1.png'
import product2 from '../../assets/landing/product-2.png'
import type { LandingDeal } from '../../hooks/useLandingDeals'

interface LandingDealsSectionProps {
  deals: LandingDeal[]
  isLoading: boolean
  isError: boolean
}

export function LandingDealsSection({
  deals,
  isLoading,
  isError,
}: LandingDealsSectionProps) {
  const [paused, setPaused] = useState(false)

  const marquee = deals.length > 0 ? [...deals, ...deals] : []
  const duration = Math.max(deals.length * 4, 24)

  return (
    <section id="deals" className="bg-[#F4EEE7]/50 py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mb-8">
          <div className="mb-2 text-xs font-medium uppercase tracking-widest text-[#8E6A72]">
            Deal thấp nhất hôm nay
          </div>
          <h2
            className="text-4xl tracking-[-0.02em] text-stone-900"
            style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
          >
            Sản phẩm giá tốt nhất
          </h2>
        </div>

        {isLoading && (
          <div className="flex h-40 items-center justify-center rounded-3xl bg-white/70 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-[#8E6A72]" />
          </div>
        )}

        {isError && (
          <div className="rounded-3xl bg-white/70 p-8 text-center text-sm text-stone-500 backdrop-blur-sm">
            Chưa thể tải danh sách deal. Vui lòng thử lại sau.
          </div>
        )}

        {!isLoading && !isError && deals.length === 0 && (
          <div className="rounded-3xl bg-white/70 p-8 text-center text-sm text-stone-500 backdrop-blur-sm">
            Hiện chưa có deal phù hợp để hiển thị.
          </div>
        )}

        {!isLoading && !isError && deals.length > 0 && (
          <div
            className="relative overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            style={{
              maskImage:
                'linear-gradient(to right, transparent, black 4%, black 96%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 4%, black 96%, transparent)',
            }}
          >
            <div
              className="flex w-max gap-4 py-4"
              style={{
                animation: `deals-marquee ${duration}s linear infinite`,
                animationPlayState: paused ? 'paused' : 'running',
              }}
            >
              {marquee.map((deal, index) => (
                <a
                  key={`${deal.id}-${index}`}
                  href={deal.url}
                  className="group/item relative w-[calc((100vw-3rem)/2)] shrink-0 rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl sm:w-[260px] md:w-[calc((min(80rem,100vw)-3rem-4rem)/5)]"
                >
                  {deal.discountLabel && (
                    <div className="absolute left-3 top-3 z-10 rounded-full bg-[#F7ECEE] px-2 py-0.5 text-[10px] font-semibold text-[#B7848C]">
                      {deal.discountLabel}
                    </div>
                  )}

                  <div className="aspect-square overflow-hidden rounded-xl bg-[#F5EEE8]">
                    <img
                      src={
                        deal.imageUrl ||
                        (index % 2 === 0 ? product2 : product1)
                      }
                      alt={deal.name}
                      loading="lazy"
                      className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover/item:scale-110"
                    />
                  </div>

                  <h3 className="mt-3 line-clamp-2 text-xs font-medium leading-snug text-stone-900">
                    {deal.name}
                  </h3>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-[#B7848C]">
                      {deal.priceLabel}
                    </span>

                    {deal.oldPriceLabel && (
                      <span className="text-[10px] text-stone-400 line-through">
                        {deal.oldPriceLabel}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-[10px] text-stone-500">
                    {deal.storeName}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes deals-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}
