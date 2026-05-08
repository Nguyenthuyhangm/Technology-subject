import  { useMemo, useState } from 'react';
import { PauseCircle, Pencil, Trash2 } from 'lucide-react';
import Badge from '../components/common/Badge';
import PlatformPill from '../components/common/PlatformPill';
import { mockAlerts } from '../data/mockAlerts';
import { mockProducts } from '../data/mockProducts';
import type { Alert } from '../types/alert';
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

const getStatusMeta = (status: Alert['status']) => {
  if (status === 'active') {
    return {
      label: 'Đang theo dõi',
      variant: 'brand' as const,
    };
  }

  if (status === 'paused') {
    return {
      label: 'Tạm dừng',
      variant: 'soft' as const,
    };
  }

  return {
    label: 'Đã chạm giá đẹp',
    variant: 'warning' as const,
  };
};

export default function AlertsPage() {
  const [alerts] = useState(mockAlerts);

  const alertRows = useMemo(() => {
    return alerts
      .map((alert) => {
        const product = mockProducts.find((item) => item.id === alert.productId);
        const bestOffer = product
          ? [...product.platforms].sort((a, b) => a.finalPrice - b.finalPrice)[0]
          : null;

        const diff =
          bestOffer && alert.targetPrice
            ? bestOffer.finalPrice - alert.targetPrice
            : 0;

        return {
          alert,
          product,
          bestOffer,
          diff,
        };
      })
      .filter((row) => row.product && row.bestOffer);
  }, [alerts]);

  const summaryText = useMemo(() => {
    const activeCount = alerts.filter((item) => item.status === 'active').length;
    const triggeredCount = alerts.filter(
      (item) => item.status === 'triggered',
    ).length;

    if (triggeredCount > 0) {
      return `${triggeredCount} món đã chạm giá đẹp · ${activeCount} món vẫn đang theo dõi`;
    }

    return `${alerts.length} món đang được theo dõi giá`;
  }, [alerts]);

  return (
    <div
      className="min-h-screen bg-[#FCF8F4] dark:bg-[#0F0D0C] text-[#241B17] dark:text-stone-100"
      style={{ fontFamily: FONT_STACK.sans }}
    >
      <div className="pointer-events-none fixed left-[-10%] top-[-12%] h-[40vw] w-[40vw] rounded-full bg-[#E9DED1] dark:bg-[#2A1F1A] opacity-45 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-6%] h-[30vw] w-[30vw] rounded-full bg-[#EDE3D8] dark:bg-[#1A1F2A] opacity-90 blur-[120px]" />

      <AppHeader currentPage="alerts" />

      <main className="mx-auto max-w-7xl px-6 pb-20 pt-36 lg:px-12">
        <section className="mb-10">
          <div className="max-w-3xl">
            <h1
              className="text-4xl leading-[1.08] text-[#241B17] md:text-5xl"
              style={{ fontFamily: FONT_STACK.serif }}
            >
              Những mức giá bạn
              <br className="hidden md:block" />
              đang chờ.
            </h1>

            <p className="mt-5 text-sm leading-7 text-[#74685F]">
              {summaryText}
            </p>
          </div>
        </section>

        <section className="space-y-5">
          {alertRows.map(({ alert, product, bestOffer, diff }) => {
            if (!product || !bestOffer) return null;

            const statusMeta = getStatusMeta(alert.status);
            const hasReachedTarget = diff <= 0;

            return (
              <article
                key={alert.id}
                className="rounded-[34px] border border-[#DDD2C6] dark:border-stone-700/40 bg-[#F8F4EE] dark:bg-[#1A1614] p-6 shadow-[0_10px_30px_rgba(33,24,19,0.06)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(33,24,19,0.08)]"
              >
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_320px] xl:items-start">
                  <div className="flex min-w-0 gap-5">
                    <div className="h-36 w-28 shrink-0 overflow-hidden rounded-[26px] bg-[#ECE4DA] dark:bg-stone-800">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>

                        {alert.platform && alert.platform !== 'all' ? (
                          <PlatformPill platform={alert.platform} compact />
                        ) : (
                          <Badge variant="soft">Mọi sàn</Badge>
                        )}
                      </div>

                      <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-[#8D7663]">
                        {product.brand}
                      </p>

                      <h2
                        className="mt-3 line-clamp-2 text-[1.68rem] leading-[1.1] tracking-[-0.025em] text-[#241B17] dark:text-stone-100"
                        style={{ fontFamily: FONT_STACK.serif }}
                      >
                        {product.name}
                      </h2>

                      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#74685F]">
                        <span>
                          Kênh thông báo:{' '}
                          <span className="text-[#241B17]">{alert.channel}</span>
                        </span>
                        <span className="text-[#B8AA9A]">•</span>
                        <span>
                          {hasReachedTarget
                            ? 'Đã chạm mức giá mong muốn'
                            : `Còn cách ${formatPrice(diff)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-l-0 border-[#DED3C7] xl:border-l xl:pl-6">
                    <div className="pb-5">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#9A8A7A]">
                        Tình trạng giá
                      </p>

                      <div className="mt-5 space-y-4">
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="text-sm text-[#7B6E64] dark:text-stone-400">Mục tiêu</span>
                          <span className="text-[1.05rem] font-medium tracking-[-0.01em] text-[#2C241F] dark:text-stone-100">
                            {formatPrice(alert.targetPrice)}
                          </span>
                        </div>

                        <div className="flex items-end justify-between gap-4">
                          <span className="text-sm text-[#7B6E64] dark:text-stone-400">Hiện tại</span>
                          <span className="text-[2.15rem] font-semibold leading-none tracking-[-0.045em] text-[#241B17] dark:text-stone-100">
                            {formatPrice(bestOffer.finalPrice)}
                          </span>
                        </div>

                        <div className="border-t border-[#E3D8CC] dark:border-stone-700/40 pt-4">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-[#7B6E64] dark:text-stone-400">Trạng thái</span>
                            <span className="text-sm font-medium text-[#6C5647] dark:text-stone-300">
                              {hasReachedTarget ? 'Đã chạm ngưỡng' : formatPrice(diff)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t border-[#DED3C7] pt-5">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full border border-[#2A211D] bg-[#2A211D] px-4 py-3 text-sm font-medium text-[#F6F1EA] transition hover:border-[#3A2D28] hover:bg-[#3A2D28]"
                      >
                        <Pencil size={15} />
                        Chỉnh alert
                      </button>

                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full border border-[#D1C3B4] bg-transparent px-4 py-3 text-sm font-medium text-[#584B43] transition hover:border-[#2A211D] hover:text-[#201915]"
                      >
                        <PauseCircle size={15} />
                        Tạm dừng
                      </button>

                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-1 py-3 text-sm font-medium text-[#8D7B6D] transition hover:text-[#644D41]"
                      >
                        <Trash2 size={15} />
                        Xóa
                      </button>
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