export function LandingCtaSection() {
  return (
    <section className="px-6 pb-20 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 rounded-3xl bg-[#B7848C] p-10 text-white md:flex-row">
        <div>
          <h3
            className="text-2xl text-white md:text-3xl"
            style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
          >
            Sẵn sàng mua sắm tinh tế hơn?
          </h3>
          <p className="mt-2 text-sm opacity-90">
            Tạo tài khoản miễn phí và bắt đầu theo dõi giá ngay hôm nay.
          </p>
        </div>

        <a
          href="/register"
          className="rounded-full bg-white px-6 py-3 text-sm font-medium text-[#B7848C] transition-opacity hover:opacity-90"
        >
          Đăng ký miễn phí
        </a>
      </div>
    </section>
  )
}
