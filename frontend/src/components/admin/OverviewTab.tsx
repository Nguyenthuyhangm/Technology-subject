import { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';
import { Users, Package, Bell, Heart, MousePointer, TrendingUp, ShoppingBag, Activity } from 'lucide-react';
import StatCard from './StatCard';
import { FONT_STACK, COLORS } from './adminConstants';
import type { Metrics } from '../../types/admin';

export default function OverviewTab() {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [metricsLoading, setMetricsLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/admin/metrics')
            .then(res => setMetrics(res.data))
            .catch(console.error)
            .finally(() => setMetricsLoading(false));
    }, []);

    const totalCommission = metrics?.transactions?.data
        ?.reduce((sum: number, t: any) => sum + (t.commission ?? 0), 0) ?? 0;

    return (
        <div className="animate-in fade-in duration-700">
            <div className="mb-10">
                <h1 className="text-3xl font-light tracking-tight text-stone-900 dark:text-stone-50"
                    style={{ fontFamily: FONT_STACK.serif }}>
                    Tổng quan hệ thống
                </h1>
                <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Theo dõi các chỉ số hiệu suất và giao dịch.</p>
            </div>

            {metricsLoading ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-[160px] animate-pulse rounded-2xl bg-black/[0.02] dark:bg-white/[0.02]" />
                    ))}
                </div>
            ) : metrics && (
                <>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard icon={Users} label="Tổng Users" value={metrics.users.total} color={COLORS.slate} />
                        <StatCard icon={Package} label="Sản Phẩm" value={metrics.products.total} color={COLORS.sage} />
                        <StatCard icon={Bell} label="Price Alerts" value={metrics.alerts.total} sub={`${metrics.alerts.active} đang hoạt động`} color={COLORS.mauve} />
                        <StatCard icon={Heart} label="Wishlist" value={metrics.wishlists.total} color={COLORS.terracotta} />
                        <StatCard icon={MousePointer} label="Affiliate Clicks" value={metrics.affiliate.totalClicks} sub={`${metrics.affiliate.clicksLast30Days} trong 30 ngày`} color={COLORS.gold} />
                        <StatCard icon={ShoppingBag} label="Đơn Hàng AT" value={metrics.transactions?.total ?? 0} sub="Qua AccessTrade" color={COLORS.forest} />
                        <StatCard icon={TrendingUp} label="Hoa Hồng (30 Ngày)" value={`${totalCommission.toLocaleString('vi-VN')}₫`} sub="Dự kiến duyệt" color={COLORS.plum} />
                        <StatCard icon={Activity} label="Thông Báo" value={metrics.notifications.total} color={COLORS.warmGrey} />
                    </div>

                    <div className="mt-12 rounded-2xl border border-black/[0.04] bg-white overflow-hidden dark:border-white/[0.04] dark:bg-[#121212]">
                        <div className="border-b border-black/[0.04] dark:border-white/[0.04] px-8 py-5">
                            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-900 dark:text-white">
                                Giao dịch AccessTrade gần đây
                            </h2>
                        </div>
                        {!metrics.transactions?.data?.length ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="h-px w-8 bg-stone-200 dark:bg-stone-800 mb-6" />
                                <p className="text-sm text-stone-500">Chưa có giao dịch nào trong 30 ngày</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th className="border-b border-black/[0.04] dark:border-white/[0.04] px-8 py-5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400">Merchant</th>
                                            <th className="border-b border-black/[0.04] dark:border-white/[0.04] px-8 py-5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400">Mã đơn</th>
                                            <th className="border-b border-black/[0.04] dark:border-white/[0.04] px-8 py-5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400">Giá trị</th>
                                            <th className="border-b border-black/[0.04] dark:border-white/[0.04] px-8 py-5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400">Hoa hồng</th>
                                            <th className="border-b border-black/[0.04] dark:border-white/[0.04] px-8 py-5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                                        {metrics.transactions.data.slice(0, 10).map((t: any) => (
                                            <tr key={t.id} className="group transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                                                <td className="px-8 py-4 font-medium text-stone-900 dark:text-stone-100 capitalize">{t.merchant}</td>
                                                <td className="px-8 py-4 font-mono text-xs text-stone-500">{t.transaction_id}</td>
                                                <td className="px-8 py-4 text-right text-stone-600 dark:text-stone-400">{t.transaction_value?.toLocaleString('vi-VN')}₫</td>
                                                <td className="px-8 py-4 text-right font-medium text-stone-900 dark:text-stone-100">{t.commission?.toLocaleString('vi-VN')}₫</td>
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`h-1.5 w-1.5 rounded-full ${
                                                            t.status === 1 ? 'bg-green-500' 
                                                            : t.status === 2 ? 'bg-red-500' 
                                                            : 'bg-stone-300 dark:bg-stone-600'
                                                        }`} />
                                                        <span className="text-xs text-stone-600 dark:text-stone-400">
                                                            {t.status === 1 ? 'Đã duyệt' : t.status === 2 ? 'Từ chối' : 'Chờ xử lý'}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}