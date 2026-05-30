import { useEffect, useMemo, useState } from 'react';
import { PauseCircle, Pencil, Play, Trash2, Mail, BellRing, MoveUpRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import { alertService, type AlertResponse } from '../service/alertApi';
import { useAuth } from '../context/AuthContext';

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(price);

const renderChannels = (channel: string) => {
  const list = channel === 'all' ? ['email', 'push'] : [channel];
  return list.map((ch) => (
    <span key={ch} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-700 bg-white/60 dark:bg-stone-800/40 px-2.5 py-1 text-[11px] text-stone-500 dark:text-stone-400">
      {ch === 'email' ? <Mail size={11} strokeWidth={1.5} /> : <BellRing size={11} strokeWidth={1.5} />}
      {ch === 'email' ? 'Email' : 'Thông báo'}
    </span>
  ));
};

const FREE_LIMIT = 5;

export default function AlertsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isFree = profile?.plan !== 'premium';
  const activeCount = alerts.filter((a) => a.active).length;
  const atLimit = isFree && activeCount >= FREE_LIMIT;

  useEffect(() => {
    alertService.getAlerts()
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const summaryText = useMemo(() => {
    const active = alerts.filter((a) => a.active).length;
    return alerts.length === 0
      ? 'Chưa có alert nào'
      : `${active} món đang theo dõi · ${alerts.length - active} tạm dừng`;
  }, [alerts]);

  const handleToggle = async (id: string) => {
    try {
      const updated = await alertService.toggleAlert(id);
      setAlerts((prev) => prev.map((a) => a.id === id ? updated : a));
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await alertService.deleteAlert(deletingId);
      setAlerts((prev) => prev.filter((a) => a.id !== deletingId));
      setDeletingId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditPrice = async (id: string) => {
    const newPrice = Number(editPrice.replace(/[^\d]/g, ''));
    if (!newPrice) return;
    try {
      const updated = await alertService.updatePrice(id, newPrice);
      setAlerts((prev) => prev.map((a) => a.id === id ? updated : a));
      setEditingId(null);
    } catch (e) { console.error(e); }
  };

  const deletingAlert = alerts.find((a) => a.id === deletingId);

  return (
    <div className="min-h-screen bg-[#FCF8F4] dark:bg-[#0F0D0C] text-[#241B17] dark:text-stone-100" style={{ fontFamily: FONT_STACK.sans }}>
      <div className="pointer-events-none fixed left-[-10%] top-[-12%] h-[40vw] w-[40vw] rounded-full bg-[#E9DED1] dark:bg-[#2A1F1A] opacity-45 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-6%] h-[30vw] w-[30vw] rounded-full bg-[#EDE3D8] dark:bg-[#1A1F2A] opacity-90 blur-[120px]" />

      <AppHeader currentPage="alerts" />

      {/* Delete confirm modal — match AlertModal style */}
      {deletingId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/30 p-4 backdrop-blur-[6px]"
          onClick={(e) => { if (e.target === e.currentTarget) setDeletingId(null); }}
        >
          <div className="glass w-full max-w-sm rounded-[32px] p-7 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8E6A72]">Xác nhận</p>
            <h2 className="mt-2 text-2xl tracking-[-0.02em] text-stone-900 dark:text-stone-100" style={{ fontFamily: FONT_STACK.serif }}>
              Xóa alert này?
            </h2>
            <p className="mt-2 text-sm leading-7 text-stone-500 dark:text-stone-400">
              Hành động này không thể hoàn tác.
            </p>

            {deletingAlert && (
              <div className="mt-4 rounded-[22px] border border-white/50 bg-white/60 dark:bg-stone-800/40 px-4 py-4 backdrop-blur-sm">
                <p className="line-clamp-2 text-sm font-medium text-stone-800 dark:text-stone-200">
                  {deletingAlert.productName}
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  Mục tiêu: {formatPrice(deletingAlert.targetPrice)}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="rounded-full border border-white/50 bg-white/60 px-5 py-3 text-sm font-medium text-stone-700 backdrop-blur-sm transition hover:text-stone-900"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="rounded-full bg-[#8E3A3A] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {deleteLoading ? 'Đang xóa...' : 'Xóa alert'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 pb-20 pt-36 lg:px-12">
        <section className="mb-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl leading-[1.08] text-[#241B17] dark:text-stone-100 md:text-5xl" style={{ fontFamily: FONT_STACK.serif }}>
              Những mức giá bạn<br className="hidden md:block" /> đang chờ.
            </h1>
            <p className="mt-5 text-sm leading-7 text-[#74685F] dark:text-stone-400">{summaryText}</p>
          </div>
        </section>

        {/* Free plan quota banner */}
        {!loading && isFree && (
          <div className={`mb-8 rounded-[24px] border p-5 ${
            atLimit
              ? 'border-[#E2C9CC] bg-[#FBF3F4] dark:border-[#4A2D31] dark:bg-[#2A1A1D]/50'
              : 'border-stone-200/80 dark:border-stone-700/40 bg-white/80 dark:bg-[#1A1614]/80'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {atLimit ? '🔒 Đã đạt giới hạn alert' : `Alert đang dùng: ${activeCount}/${FREE_LIMIT}`}
                  </p>
                  {atLimit && (
                    <span className="rounded-full bg-[#B7848C] px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                      Free
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${atLimit ? 'bg-[#B7848C]' : 'bg-[#B7848C]/60'}`}
                    style={{ width: `${Math.min((activeCount / FREE_LIMIT) * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                  {atLimit
                    ? 'Nâng cấp Premium để tạo không giới hạn alert.'
                    : `Còn ${FREE_LIMIT - activeCount} alert. Nâng cấp để không giới hạn.`}
                </p>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="shrink-0 rounded-full bg-[#B7848C] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
              >
                Upgrade
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-stone-400">Đang tải...</p>
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <div className="rounded-[34px] border border-stone-200/80 dark:border-stone-700/40 bg-white/80 dark:bg-[#1A1614]/80 p-10 text-center">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8E6A72]">Trống</p>
            <h2 className="mt-3 text-2xl text-stone-900 dark:text-stone-100" style={{ fontFamily: FONT_STACK.serif }}>
              Chưa có alert nào
            </h2>
            <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
              Vào trang chi tiết sản phẩm và bấm "Đặt alert" để bắt đầu theo dõi giá.
            </p>
          </div>
        )}

        <section className="space-y-5">
          {alerts.map((alert) => (
            <article key={alert.id}
              className="rounded-[34px] border border-[#DDD2C6] dark:border-stone-700/40 bg-[#F8F4EE] dark:bg-[#1A1614] p-6 shadow-[0_10px_30px_rgba(33,24,19,0.06)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(33,24,19,0.08)]"
            >
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_280px] xl:items-start">
                <div className="flex min-w-0 gap-5">
                  {alert.productImageUrl && (
                    <div className="h-28 w-24 shrink-0 overflow-hidden rounded-[22px] bg-[#ECE4DA] dark:bg-stone-800">
                      <img src={alert.productImageUrl} alt={alert.productName} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        alert.active
                          ? 'bg-[#FBF3F4] dark:bg-[#2A1A1D]/60 text-[#B7848C] border border-[#E2C9CC]'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-400 border border-stone-200 dark:border-stone-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${alert.active ? 'bg-[#B7848C]' : 'bg-stone-400'}`} />
                        {alert.active ? 'Đang theo dõi' : 'Tạm dừng'}
                      </span>
                      {alert.platformName && (
                        <span className="rounded-full border border-stone-200 dark:border-stone-700 px-2.5 py-0.5 text-[11px] text-stone-500">
                          {alert.platformName}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 line-clamp-2 text-[1.35rem] leading-[1.2] tracking-[-0.02em] text-[#241B17] dark:text-stone-100" style={{ fontFamily: FONT_STACK.serif }}>
                      {alert.productName}
                    </h2>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {renderChannels(alert.channel)}
                      {alert.notifiedAt && (
                        <span className="text-[11px] text-stone-400 dark:text-stone-500">
                          · Đã gửi {new Date(alert.notifiedAt).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-l-0 border-[#DED3C7] dark:border-stone-700/40 xl:border-l xl:pl-6">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[#9A8A7A]">Giá mục tiêu</p>

                  {editingId === alert.id ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="flex-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm outline-none focus:border-[#B7848C]"
                        placeholder="Giá mới"
                      />
                      <button onClick={() => handleEditPrice(alert.id)}
                        className="rounded-xl bg-[#1F1A17] px-3 py-2 text-xs text-white hover:opacity-90">
                        Lưu
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-500">
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-[#241B17] dark:text-stone-100">
                      {formatPrice(alert.targetPrice)}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#DED3C7] dark:border-stone-700/40 pt-4">
                    <Link
                      to={`/product/${alert.productId}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#2A211D] bg-[#2A211D] px-3.5 py-2.5 text-xs font-medium text-[#F6F1EA] transition hover:opacity-90"
                    >
                      <MoveUpRight size={13} /> Xem chi tiết
                    </Link>
                    <button onClick={() => { setEditingId(alert.id); setEditPrice(String(alert.targetPrice)); }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#D1C3B4] dark:border-stone-600 px-3.5 py-2.5 text-xs font-medium text-[#584B43] dark:text-stone-400 transition hover:border-[#2A211D] hover:text-[#201915]">
                      <Pencil size={13} /> Chỉnh giá
                    </button>
                    <button onClick={() => handleToggle(alert.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#D1C3B4] dark:border-stone-600 px-3.5 py-2.5 text-xs font-medium text-[#584B43] dark:text-stone-400 transition hover:border-[#2A211D] hover:text-[#201915]">
                      {alert.active ? <PauseCircle size={13} /> : <Play size={13} />}
                      {alert.active ? 'Tạm dừng' : 'Bật lại'}
                    </button>
                    <button onClick={() => setDeletingId(alert.id)}
                      className="inline-flex items-center gap-1.5 px-1 py-2.5 text-xs font-medium text-[#8D7B6D] transition hover:text-red-500">
                      <Trash2 size={13} /> Xóa
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}