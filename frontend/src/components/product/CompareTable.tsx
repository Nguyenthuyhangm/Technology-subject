
import { MoveUpRight } from 'lucide-react';
import Badge from '../common/Badge';
import PlatformPill from '../common/PlatformPill';
import type { PriceComparisonItem } from '../../types/product';

type CompareTableProps = {
  items: PriceComparisonItem[];
};

const formatPrice = (price: number): string =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);

const formatRelativeTime = (dateString: string): string => {
  const input = new Date(dateString).getTime();
  const now = Date.now();
  const diffMinutes = Math.max(1, Math.floor((now - input) / 60000));

  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const hours = Math.floor(diffMinutes / 60);
  return `${hours} giờ trước`;
};

export default function CompareTable({ items }: CompareTableProps) {
  // Sắp xếp theo price tăng dần (API dùng price thay vì finalPrice)
  const sorted = [...items].sort((a, b) => a.price - b.price);
  const bestPrice = sorted[0]?.price ?? 0;

  return (
      <div className="overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="border-b border-stone-100 px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
            Compare table
          </p>
          <h2 className="mt-2 text-xl font-semibold text-stone-900">
            So sánh giá chi tiết theo sàn
          </h2>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full text-left">
            <thead>
            <tr className="border-b border-stone-100 bg-[#FCFBF8] text-[11px] uppercase tracking-[0.18em] text-stone-400">
              <th className="px-6 py-4">Sàn</th>
              <th className="px-4 py-4">Giá hiện tại</th>
              <th className="px-4 py-4">Giá gốc</th>
              <th className="px-4 py-4">Giảm</th>
              <th className="px-4 py-4">Ưu đãi</th>
              <th className="px-4 py-4">Tồn kho</th>
              <th className="px-4 py-4">Cập nhật</th>
              <th className="px-6 py-4 text-right">CTA</th>
            </tr>
            </thead>

            <tbody>
            {sorted.map((item) => {
              const isBest = item.price === bestPrice;

              return (
                  <tr
                      key={item.listingId}
                      className={`border-b border-stone-100 align-top transition hover:bg-[#FCFBF8] ${
                          isBest ? 'bg-[#FFF8FA]' : ''
                      }`}
                  >
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        <PlatformPill platform={item.platformName} />
                        <div className="mt-2 flex flex-wrap gap-2">
                          {isBest && <Badge variant="brand">Giá tốt nhất</Badge>}
                          {item.isFlashSale && (
                              <Badge variant="danger">Flash Sale</Badge>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-5">
                      <p className="text-lg font-semibold tracking-tight text-stone-900">
                        {formatPrice(item.price)}
                      </p>
                    </td>

                    <td className="px-4 py-5">
                      {item.originalPrice > item.price ? (
                          <p className="text-sm text-stone-300 line-through">
                            {formatPrice(item.originalPrice)}
                          </p>
                      ) : (
                          <p className="text-sm text-stone-400">—</p>
                      )}
                    </td>

                    <td className="px-4 py-5 text-sm text-stone-600">
                      {item.discountPct > 0
                          ? `-${Math.round(item.discountPct)}%`
                          : '—'}
                    </td>

                    <td className="px-4 py-5 text-sm text-stone-600">
                      {item.promotionLabel || '—'}
                    </td>

                    <td className="px-4 py-5">
                      {item.inStock ? (
                          <Badge variant="success">Còn hàng</Badge>
                      ) : (
                          <Badge variant="danger">Hết hàng</Badge>
                      )}
                    </td>

                    <td className="px-4 py-5 text-sm text-stone-500">
                      {formatRelativeTime(item.crawledAt)}
                    </td>

                    <td className="px-6 py-5 text-right">
                      <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                      >
                        Mua ngay
                        <MoveUpRight size={15} />
                      </a>
                    </td>
                  </tr>
              );
            })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-4 p-4 lg:hidden">
          {sorted.map((item) => {
            const isBest = item.price === bestPrice;

            return (
                <div
                    key={`${item.listingId}-mobile`}
                    className={`rounded-[24px] border p-4 ${
                        isBest
                            ? 'border-[#D7B6BA] bg-[#FFF8FA]'
                            : 'border-stone-200 bg-[#FCFBF8]'
                    }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <PlatformPill platform={item.platformName} />
                    </div>
                    <div className="flex gap-2">
                      {isBest && <Badge variant="brand">Tốt nhất</Badge>}
                      {item.isFlashSale && <Badge variant="danger">Flash Sale</Badge>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-stone-400">Giá hiện tại</p>
                      <p className="font-semibold text-stone-900">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-stone-400">Giá gốc</p>
                      {item.originalPrice > item.price ? (
                          <p className="text-stone-300 line-through">
                            {formatPrice(item.originalPrice)}
                          </p>
                      ) : (
                          <p className="text-stone-400">—</p>
                      )}
                    </div>
                    <div>
                      <p className="text-stone-400">Giảm</p>
                      <p className="text-stone-700">
                        {item.discountPct > 0
                            ? `-${Math.round(item.discountPct)}%`
                            : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-stone-400">Ưu đãi</p>
                      <p className="text-stone-700">{item.promotionLabel || '—'}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    {item.inStock ? (
                        <Badge variant="success">Còn hàng</Badge>
                    ) : (
                        <Badge variant="danger">Hết hàng</Badge>
                    )}

                    <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white"
                    >
                      Mua
                      <MoveUpRight size={15} />
                    </a>
                  </div>
                </div>
            );
          })}
        </div>
      </div>
  );
}
