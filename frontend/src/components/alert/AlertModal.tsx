import React, { useEffect, useState } from 'react';
import { CheckCheck, X, Bell, Mail, BellRing } from 'lucide-react';
import type { PlatformName } from '../../types/product';
import type { AlertChannel } from '../../types/alert';
import { alertService } from '../../service/alertApi';

const platformOptions: Array<{ value: PlatformName | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả sàn' },
  { value: 'Cocolux', label: 'Cocolux' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'Hasaki', label: 'Hasaki' },
  { value: 'Tiki', label: 'Tiki' },
];

type AlertModalProps = {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName?: string;
  defaultPrice?: number;
  defaultPlatform?: PlatformName | 'all';
};

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(price);

export default function AlertModal({
  isOpen,
  onClose,
  productId,
  productName,
  defaultPrice = 0,
}: AlertModalProps) {
  const [targetPrice, setTargetPrice] = useState(defaultPrice ? String(defaultPrice) : '');
  const [platform, setPlatform] = useState<PlatformName | 'all'>('all');
  const [channels, setChannels] = useState<Set<AlertChannel>>(new Set(['email']));
  const [isCreated, setIsCreated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTargetPrice(defaultPrice ? String(defaultPrice) : '');
    setPlatform('all');
    setChannels(new Set(['email']));
    setIsCreated(false);
    setError('');
  }, [defaultPrice, isOpen]);

  if (!isOpen) return null;

  const parsedPrice = Number(targetPrice.replace(/[^\d]/g, '') || 0);

  const toggleChannel = (ch: AlertChannel) => {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) {
        if (next.size === 1) return prev; // phải giữ ít nhất 1
        next.delete(ch);
      } else {
        next.add(ch);
      }
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  if (parsedPrice <= 0) { setError('Vui lòng nhập giá mục tiêu hợp lệ'); return; }
  setLoading(true);
  setError('');
  try {
    // Nếu tick cả 2 → channel = "all", nếu 1 → lấy cái đó
    const channel = channels.size === 2 ? 'all' : Array.from(channels)[0];
    await alertService.createAlert({ productId, targetPrice: parsedPrice, channel });
    setIsCreated(true);
  } catch (e: any) {
    setError(e?.response?.data?.message ?? 'Không thể tạo alert. Vui lòng thử lại.');
  } finally {
    setLoading(false);
  }
};

  const channelLabel = Array.from(channels)
    .map(c => c === 'email' ? 'Email' : 'Thông báo')
    .join(' & ');

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 backdrop-blur-sm bg-stone-950/20 sm:items-center">
      <div
        className="w-full max-w-md rounded-[32px] border border-stone-200/60 dark:border-stone-700/40 bg-[#FDFAF7] dark:bg-[#1A1614] shadow-[0_32px_80px_rgba(15,10,8,0.18)] overflow-hidden"
        style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
      >
        {isCreated ? (
          <div className="p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F0F7E8] dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <CheckCheck size={26} strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 text-2xl tracking-[-0.02em] text-stone-900 dark:text-stone-100"
                style={{ fontFamily: '"Times New Roman", Georgia, serif' }}>
                Alert đã được tạo
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                Thông báo khi{' '}
                <span className="font-medium text-stone-700 dark:text-stone-300">{productName ?? 'sản phẩm'}</span>{' '}
                xuống còn{' '}
                <span className="font-medium text-stone-900 dark:text-stone-100">{formatPrice(parsedPrice)}</span>
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {Array.from(channels).map((ch) => (
                  <span key={ch} className="inline-flex items-center gap-1.5 rounded-2xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800/40 px-3 py-1.5 text-xs text-stone-500 dark:text-stone-400">
                    {ch === 'email' ? <Mail size={11} /> : <BellRing size={11} />}
                    {ch === 'email' ? 'Email' : 'Thông báo'}
                  </span>
                ))}
              </div>
              <button type="button" onClick={onClose}
                className="mt-6 w-full rounded-full bg-[#1F1A17] dark:bg-stone-100 py-3.5 text-sm font-medium text-white dark:text-stone-900 transition hover:opacity-90">
                Xong
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-100 dark:border-stone-700/40 px-7 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F8F1F3] dark:bg-[#2A1A1D]/60 text-[#B7848C]">
                  <Bell size={16} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-base font-semibold tracking-[-0.01em] text-stone-900 dark:text-stone-100">
                    Đặt cảnh báo giá
                  </h2>
                  {productName && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-stone-400 dark:text-stone-500">{productName}</p>
                  )}
                </div>
              </div>
              <button type="button" onClick={onClose}
                className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">
              {/* Giá mục tiêu */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                  Giá mục tiêu
                </label>
                <div className="relative">
                  <input
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/60 px-4 py-3.5 pr-14 text-sm text-stone-900 dark:text-stone-100 outline-none transition placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:border-[#B7848C] focus:ring-2 focus:ring-[#B7848C]/10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-stone-400">VNĐ</span>
                </div>
                {parsedPrice > 0 && (
                  <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-500">= {formatPrice(parsedPrice)}</p>
                )}
              </div>

              {/* Theo dõi sàn */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                  Theo dõi sàn
                </label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value as PlatformName | 'all')}
                  className="w-full rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/60 px-4 py-3.5 text-sm text-stone-900 dark:text-stone-100 outline-none transition focus:border-[#B7848C] focus:ring-2 focus:ring-[#B7848C]/10">
                  {platformOptions.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Kênh nhận — tick được cả 2 */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                  Nhận thông báo qua
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'email' as AlertChannel, icon: Mail, label: 'Email' },
                    { value: 'push' as AlertChannel, icon: BellRing, label: 'Thông báo' },
                  ]).map(({ value, icon: Icon, label }) => {
                    const active = channels.has(value);
                    return (
                      <button key={value} type="button" onClick={() => toggleChannel(value)}
                        className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? 'border-[#B7848C] bg-[#FBF3F4] dark:bg-[#2A1A1D]/60 text-[#B7848C]'
                            : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                        }`}>
                        <Icon size={15} strokeWidth={1.5} />
                        <span className="text-sm font-medium">{label}</span>
                        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#B7848C]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-500">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 rounded-full border border-stone-200 dark:border-stone-700 py-3 text-sm font-medium text-stone-600 dark:text-stone-400 transition hover:bg-stone-50 dark:hover:bg-stone-800">
                  Hủy
                </button>
                <button type="submit" disabled={loading}
                  className="flex-[2] rounded-full bg-[#1F1A17] dark:bg-stone-100 py-3 text-sm font-semibold text-white dark:text-stone-900 transition hover:opacity-90 disabled:opacity-50">
                  {loading ? 'Đang tạo...' : 'Tạo alert'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}