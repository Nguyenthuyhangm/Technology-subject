import { useState } from 'react'

const brands = [
  { name: 'HASAKI', color: 'text-stone-500' },
  { name: 'Guardian', color: 'text-orange-500' },
  { name: 'COCOLUX', color: 'text-black' },
  { name: 'Shopee', color: 'text-orange-500' },
  { name: 'Lazada', color: 'text-orange-500' },
  { name: 'TIKI', color: 'text-blue-500' },
]

export function LandingBrandsSection() {
  const [paused, setPaused] = useState(false)
  const marqueeBrands = [...brands, ...brands, ...brands]

  return (
    <section id="stores" className="py-20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 text-center lg:px-12">
        <div className="mb-2 text-xs font-medium uppercase tracking-widest text-[#8E6A72]">
          Mua sắm tại nơi bạn tin tưởng
        </div>
        <h2
          className="text-3xl tracking-[-0.02em] text-stone-900 md:text-4xl"
          style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
        >
          Theo dõi giá từ các sàn và cửa hàng uy tín
        </h2>

        <div
          className="mt-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className="flex w-max gap-4 py-4"
            style={{
              animation: 'brands-marquee 30s linear infinite',
              animationPlayState: paused ? 'paused' : 'running',
            }}
          >
            {marqueeBrands.map((brand, index) => (
              <div
                key={`${brand.name}-${index}`}
                className={`flex h-20 w-32 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-base font-semibold tracking-wide transition-colors hover:text-[#8E6A72] backdrop-blur-sm ${brand.color}`}
              >
                {brand.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes brands-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-33.33%); }
        }
      `}</style>
    </section>
  )
}
