import { Bell, MoveUpRight, Trash2, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../components/common/Badge';
import PlatformPill from '../components/common/PlatformPill';
import AppHeader from '../components/layout/AppHeader';
import { useWishlist } from '../context/useWishlist';
import type { WishlistDisplayItem } from '../types/wishlist';

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, isRemoving } = useWishlist();

  const handleRemove = async (productId: string) => {
    try {
      await removeFromWishlist(productId);
    } catch (error) {
      console.error("Không thể xóa sản phẩm:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCF8F4] text-[#241B17]" style={{ fontFamily: FONT_STACK.sans }}>
      {/* Background Decor */}
      <div className="pointer-events-none fixed left-[-10%] top-[-12%] h-[40vw] w-[40vw] rounded-full bg-[#E9DED1] opacity-45 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-6%] h-[30vw] w-[30vw] rounded-full bg-[#EDE3D8] opacity-90 blur-[120px]" />

      <AppHeader currentPage="wishlist" />

      <main className="mx-auto max-w-7xl px-6 pb-36 pt-36 lg:px-12">
        <section className="mb-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl leading-[1.12] md:text-5xl" style={{ fontFamily: FONT_STACK.serif }}>
              Những món bạn <br className="hidden md:block" /> muốn quay lại.
            </h1>
            <p className="mt-5 text-sm leading-7 text-[#74685F]">
              Bạn đang theo dõi {wishlist.length} sản phẩm. Dữ liệu được cập nhật từ hệ thống PriceHawk.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          {wishlist.length === 0 ? (
            <div className="rounded-[34px] border border-dashed border-[#DDD2C6] p-20 text-center">
              <p className="text-[#74685F]">Danh sách wishlist của bạn đang trống.</p>
              <Link to="/" className="mt-4 inline-block text-[#8D7663] underline">Khám phá sản phẩm ngay</Link>
            </div>
          ) : (
            wishlist.map((item: WishlistDisplayItem) => {
              const pId = item.productId || item.id || '';
              
              return (
                <article key={pId} className="relative z-10 rounded-[34px] border border-[#DDD2C6] bg-[#F8F4EE] p-6 shadow-sm transition-all hover:-translate-y-1">
                  <div className="flex flex-col gap-6 xl:flex-row">
                    {/* Cột thông tin sản phẩm */}
                    <div className="flex gap-5 xl:w-[42%]">
                      <div className="h-36 w-28 shrink-0 overflow-hidden rounded-[26px] bg-[#ECE4DA]">
                        {/* --- ĐÃ FIX CƠ CHẾ ẢNH Ở ĐÂY --- */}
                        <img 
                            src={item.imageUrl || (item.images ? item.images[0] : '') || 'https://placehold.co/400x500/ECE4DA/8D7663?text=No+Image'} 
                            alt={item.productName || item.name || 'Sản phẩm'} 
                            className="h-full w-full object-cover"
                            onError={(e) => {
                                // Nếu ảnh lỗi 404, tự động thay thế bằng ảnh placeholder
                                e.currentTarget.src = 'https://placehold.co/400x500/ECE4DA/8D7663?text=No+Image';
                            }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.nearTarget && <Badge variant="warning">Giá tốt</Badge>}
                          <Badge variant="soft">Đã chuẩn hóa</Badge>
                        </div>

                        <p className="mt-4 text-[10px] uppercase tracking-widest text-[#8D7663]">
                            {item.brandName || item.brand || 'Thương hiệu'}
                        </p>
                        <h2 className="mt-3 text-2xl leading-tight line-clamp-2" style={{ fontFamily: FONT_STACK.serif }}>
                            {item.productName || item.name}
                        </h2>
                      </div>
                    </div>

                    {/* Cột giá và hành động */}
                    <div className="flex-1 space-y-5">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-[24px] border border-[#DDD2C6] bg-[#F3EDE5] p-4">
                          <p className="text-[10px] uppercase text-[#9A8A7A]">Giá đẹp nhất</p>
                          <p className="mt-3 text-lg font-semibold">{formatPrice(item.minPrice || item.price || 0)}</p>
                        </div>

                        <div className="rounded-[24px] border border-[#DDD2C6] bg-[#F3EDE5] p-4">
                          <p className="text-[10px] uppercase text-[#9A8A7A]">Sàn tốt nhất</p>
                          <div className="mt-3">
                            {item.platformName ? (
                                <PlatformPill platform={item.platformName} compact />
                            ) : (
                                <span className="text-sm text-[#8D7663]">-</span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-[#DDD2C6] bg-[#F3EDE5] p-4">
                          <p className="text-[10px] uppercase text-[#9A8A7A]">Biến động</p>
                          <p className="mt-3 inline-flex items-center gap-2 text-lg font-semibold">
                            <TrendingDown size={16} className="text-[#7A5D49]" />
                            {item.priceChanged7dPercent || 0}%
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[26px] bg-[#F3EDE5] p-5">
                        <div className="flex gap-3">
                          <Link to={`/product/${pId}`} className="inline-flex items-center gap-2 rounded-full bg-[#2A211D] px-5 py-3 text-sm text-white transition hover:bg-[#3A2D28]">
                            Xem chi tiết <MoveUpRight size={15} />
                          </Link>
                          
                          <button className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#D1C3B4] px-4 py-3 text-sm hover:bg-[#DDD2C6] transition">
                            <Bell size={15} /> Alert
                          </button>
                        </div>

                        <button
                            onClick={() => handleRemove(pId)}
                            disabled={isRemoving(pId)}
                            className="flex cursor-pointer items-center gap-2 text-sm text-[#8D7B6D] hover:text-red-600 transition disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 size={15} /> {isRemoving(pId) ? 'Đang xóa...' : 'Xóa'}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}