import { useLandingDeals } from '../hooks/useLandingDeals'
import { LandingHero } from '../components/landing/LandingHero'
import { LandingDealsSection } from '../components/landing/LandingDealsSection'
import { LandingBrandsSection } from '../components/landing/LandingBrandsSection'
import { LandingFeaturesSection } from '../components/landing/LandingFeaturesSection'
import { LandingCtaSection } from '../components/landing/LandingCtaSection'
import { LandingFooter } from '../components/landing/LandingFooter'

const navItems = [
  { label: 'Trang chủ', active: true, href: '/landing' },
  { label: 'Chọn lọc hôm nay', href: '#deals' },
  { label: 'Tính năng', href: '#features' },
  { label: 'Đối tác', href: '#stores' },
]

export default function LandingPage() {
  const { deals, isLoading, isError } = useLandingDeals({
    limit: 10,
    sortBy: 'discount',
  })

  return (
    <div className="min-h-screen bg-[#FCF8F4] text-stone-900">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-12">
        <a
          href="/landing"
          className="text-[1.7rem] tracking-normal text-stone-900"
          style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
        >
          Price<span className="text-[#B7848C]">Hawk</span>
        </a>

        <nav className="hidden items-center gap-8 text-sm md:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`relative transition-colors hover:text-[#8E6A72] ${
                item.active ? 'text-stone-900' : 'text-stone-500'
              }`}
            >
              {item.label}
              {item.active && (
                <span className="absolute -bottom-1 left-0 h-0.5 w-6 rounded-full bg-[#B7848C]" />
              )}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="rounded-full border border-stone-200 bg-white/80 px-5 py-2 text-sm font-medium transition-colors hover:bg-white text-stone-700"
          >
            Login
          </a>
          <a
            href="/register"
            className="rounded-full bg-[#B7848C] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Sign in
          </a>
        </div>
      </header>

      <LandingHero deals={deals} />

      <LandingDealsSection
        deals={deals}
        isLoading={isLoading}
        isError={isError}
      />

      <LandingBrandsSection />

      <LandingFeaturesSection />

      <LandingCtaSection />

      <LandingFooter />
    </div>
  )
}
