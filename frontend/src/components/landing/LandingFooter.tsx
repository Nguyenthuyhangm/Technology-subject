import { Search, ArrowRight } from 'lucide-react'

export function LandingFooter() {
  return (
    <footer className="border-t border-stone-200/70 bg-[#E8E2DB] pb-12 pt-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:px-12 md:grid-cols-5">
        <div>
          <div
            className="text-xl text-stone-900"
            style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
          >
            Price<span className="text-[#B7848C]">Hawk</span>
          </div>
          <p className="mt-3 text-sm text-stone-500">
            Theo dõi giá thông minh và chọn đúng thời điểm mua tốt nhất.
          </p>
          <div className="mt-5 flex gap-2">
            <a
              href="/search"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white/60 text-[#B7848C] hover:bg-[#F7ECEE]"
            >
              <Search className="h-4 w-4" />
            </a>
          </div>
        </div>

        {[
          {
            title: 'Khám phá',
            links: ['Trang chủ', 'So sánh giá', 'Chọn lọc hôm nay', 'Blog'],
          },
          {
            title: 'Tính năng',
            links: [
              'Theo dõi giá',
              'Yêu thích',
              'Alert giá tốt',
              'AI đề xuất',
            ],
          },
          {
            title: 'Hỗ trợ',
            links: [
              'Trung tâm trợ giúp',
              'Liên hệ',
              'Điều khoản',
              'Chính sách bảo mật',
            ],
          },
        ].map((column) => (
          <div key={column.title}>
            <h4 className="mb-4 text-sm font-semibold text-stone-900">{column.title}</h4>
            <ul className="space-y-2 text-sm text-stone-500">
              {column.links.map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-[#8E6A72]">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h4 className="mb-3 text-sm font-semibold text-stone-900">Nhận tin khuyến mãi</h4>
          <p className="text-sm text-stone-500">
            Nhận cập nhật và deal tốt nhất mỗi tuần.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="relative">
              <input
                type="email"
                placeholder="Nhập email của bạn"
                className="h-12 w-full rounded-full border border-stone-200 bg-white/80 px-5 pr-12 text-sm outline-none transition-colors focus:border-[#B7848C]"
              />
              <a
                href="/register"
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#B7848C] text-white transition-opacity hover:opacity-90"
                aria-label="Đăng ký nhận tin"
              >
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl border-t border-stone-200/70 py-5 text-center text-xs text-stone-400 lg:px-12">
        © 2026 PriceHawk. All rights reserved.
      </div>
    </footer>
  )
}
