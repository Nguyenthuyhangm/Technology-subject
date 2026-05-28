import {
  Sparkles,
  Bell,
  Heart,
  Scale,
} from 'lucide-react'

const features = [
  {
    icon: Sparkles,
    title: 'AI thông minh',
    desc: 'AI phân tích dữ liệu giá và gợi ý thời điểm mua tốt hơn.',
  },
  {
    icon: Bell,
    title: 'Alert giá tốt',
    desc: 'Nhận thông báo khi sản phẩm bạn theo dõi giảm giá.',
  },
  {
    icon: Heart,
    title: 'Lưu Wishlist',
    desc: 'Lưu sản phẩm yêu thích và theo dõi giá dễ dàng.',
  },
  {
    icon: Scale,
    title: 'So sánh giá',
    desc: 'So sánh giá giữa nhiều sàn để chọn nơi mua tối ưu.',
  },
]

export function LandingFeaturesSection() {
  return (
    <section id="features" className="py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="text-center">
          <div className="mb-2 text-xs font-medium uppercase tracking-widest text-[#8E6A72]">
            Tính năng nổi bật
          </div>
          <h2
            className="text-3xl tracking-[-0.02em] text-stone-900 md:text-4xl"
            style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
          >
            Mua sắm thông minh hơn với{' '}
            <span style={{ fontFamily: '"Times New Roman", Georgia, serif' }}>
              Price<span className="text-[#B7848C]">Hawk</span>
            </span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl bg-white/70 p-7 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-6 flex h-32 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F7ECEE] to-[#F4EEE7]">
                <feature.icon
                  className="h-10 w-10 text-[#B7848C]"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="text-base font-semibold text-stone-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
