// components/admin/AffiliateTab.tsx
import { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';
import { MousePointer, TrendingUp, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { FONT_STACK, COLORS } from './adminConstants';
import StatCard from './StatCard';

type ClickRow = {
    id: string;
    clickedAt: string;
    platform: string;
    userId?: string;
    userEmail?: string;
    productId?: string;
    productName?: string;
};

type PlatformStat = { platform: string; count: number };
type DayStat = { day: string; count: number };
type TopProduct = { productId: string; productName?: string; count: number };

type AffiliateData = {
    clicks: ClickRow[];
    byPlatform: PlatformStat[];
    byDay: DayStat[];
    topProducts: TopProduct[];
    totalClicks: number;
};

const PLATFORMS = ['all', 'Tiki', 'Watsons', 'Hasaki', 'Guardian', 'Cocolux'];
const PAGE_SIZE = 20;

export default function AffiliateTab() {
    const [data, setData] = useState<AffiliateData | null>(null);
    const [loading, setLoading] = useState(true);
    const [platform, setPlatform] = useState('all');
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    const fetchData = (p = platform, pg = page) => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(pg), size: String(PAGE_SIZE) });
        if (p !== 'all') params.set('platform', p);

        apiClient.get(`/admin/affiliate-clicks?${params}`)
            .then(res => {
                setData(res.data);
                setTotalCount(Number(res.headers['x-total-count'] ?? res.data.totalClicks ?? 0));
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    const handlePlatformChange = (p: string) => {
        setPlatform(p);
        setPage(0);
        fetchData(p, 0);
    };

    const handlePage = (dir: 1 | -1) => {
        const next = page + dir;
        setPage(next);
        fetchData(platform, next);
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // Tính tổng clicks 30 ngày từ byDay
    const clicks30d = data?.byDay.reduce((s, d) => s + Number(d.count), 0) ?? 0;

    // Bar chart đơn giản bằng CSS
    const maxDay = data ? Math.max(...data.byDay.map(d => Number(d.count)), 1) : 1;

    return (
        <div className="animate-in fade-in duration-700">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-3xl font-light tracking-tight text-stone-900 dark:text-stone-50"
                    style={{ fontFamily: FONT_STACK.serif }}>
                    Affiliate Clicks
                </h1>
                <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                    Theo dõi lượt click mua hàng và hiệu quả affiliate.
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-10">
                <StatCard icon={MousePointer} label="Tổng clicks" value={data?.totalClicks ?? 0} color={COLORS.gold} />
                <StatCard icon={TrendingUp} label="Clicks 30 ngày" value={clicks30d} color={COLORS.sage} />
                <StatCard icon={ShoppingBag} label="Sàn có clicks" value={data?.byPlatform.length ?? 0} color={COLORS.mauve} />
            </div>

            {/* 2 cột: biểu đồ ngày + top sản phẩm */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

                {/* Clicks theo ngày — bar chart CSS */}
                <div className="rounded-2xl border border-black/[0.04] bg-white dark:border-white/[0.04] dark:bg-[#121212] overflow-hidden">
                    <div className="border-b border-black/[0.04] dark:border-white/[0.04] px-6 py-4">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-900 dark:text-white">
                            Clicks theo ngày (30 ngày)
                        </h2>
                    </div>
                    <div className="px-6 py-5">
                        {!data || data.byDay.length === 0 ? (
                            <p className="text-sm text-stone-400 text-center py-8">Chưa có dữ liệu</p>
                        ) : (
                            <div className="flex items-end gap-[3px] h-32">
                                {data.byDay.map((d) => (
                                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                                        <div
                                            className="w-full rounded-t bg-[#B7848C]/70 group-hover:bg-[#B7848C] transition-colors"
                                            style={{ height: `${Math.max(4, (Number(d.count) / maxDay) * 100)}%` }}
                                        />
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10">
                                            <div className="bg-stone-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap">
                                                {d.day.slice(5)}: {d.count}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Phân bố theo sàn */}
                <div className="rounded-2xl border border-black/[0.04] bg-white dark:border-white/[0.04] dark:bg-[#121212] overflow-hidden">
                    <div className="border-b border-black/[0.04] dark:border-white/[0.04] px-6 py-4">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-900 dark:text-white">
                            Phân bố theo sàn (30 ngày)
                        </h2>
                    </div>
                    <div className="px-6 py-5 space-y-3">
                        {!data || data.byPlatform.length === 0 ? (
                            <p className="text-sm text-stone-400 text-center py-8">Chưa có dữ liệu</p>
                        ) : (() => {
                            const maxPlat = Math.max(...data.byPlatform.map(p => Number(p.count)), 1);
                            return data.byPlatform.map(p => (
                                <div key={p.platform} className="flex items-center gap-3">
                                    <span className="w-20 text-xs text-stone-500 capitalize shrink-0">{p.platform}</span>
                                    <div className="flex-1 h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-[#B7848C]"
                                            style={{ width: `${(Number(p.count) / maxPlat) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-stone-700 dark:text-stone-300 w-8 text-right">
                                        {p.count}
                                    </span>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            </div>

            {/* Top sản phẩm */}
            <div className="rounded-2xl border border-black/[0.04] bg-white dark:border-white/[0.04] dark:bg-[#121212] overflow-hidden mb-10">
                <div className="border-b border-black/[0.04] dark:border-white/[0.04] px-6 py-4">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-900 dark:text-white">
                        Top sản phẩm được click (30 ngày)
                    </h2>
                </div>
                <div className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                    {!data || data.topProducts.length === 0 ? (
                        <p className="text-sm text-stone-400 text-center py-8">Chưa có dữ liệu</p>
                    ) : data.topProducts.map((p, i) => (
                        <div key={p.productId} className="flex items-center gap-4 px-6 py-3 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                            <span className="text-xs font-medium text-stone-400 w-4">{i + 1}</span>
                            <span className="flex-1 text-sm text-stone-800 dark:text-stone-200 truncate">
                                {p.productName ?? p.productId}
                            </span>
                            <span className="text-xs font-semibold text-[#B7848C]">{p.count} clicks</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bảng chi tiết clicks */}
            <div className="rounded-2xl border border-black/[0.04] bg-white dark:border-white/[0.04] dark:bg-[#121212] overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.04] dark:border-white/[0.04] px-6 py-4">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-900 dark:text-white">
                        Chi tiết clicks
                    </h2>
                    <div className="flex items-center gap-2">
                        {PLATFORMS.map(p => (
                            <button key={p}
                                onClick={() => handlePlatformChange(p)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                    platform === p
                                        ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
                                }`}>
                                {p === 'all' ? 'Tất cả' : p}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="h-5 w-5 animate-spin rounded-full border-[1.5px] border-[#B7848C] border-t-transparent" />
                    </div>
                ) : !data || data.clicks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="h-px w-8 bg-stone-200 dark:bg-stone-800 mb-4" />
                        <p className="text-sm text-stone-400">Chưa có click nào</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        {['Thời gian', 'Sàn', 'Sản phẩm', 'User'].map(h => (
                                            <th key={h} className="border-b border-black/[0.04] dark:border-white/[0.04] px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                                    {data.clicks.map(c => (
                                        <tr key={c.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                                            <td className="px-6 py-3 font-mono text-xs text-stone-500 whitespace-nowrap">
                                                {new Date(c.clickedAt).toLocaleString('vi-VN')}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 capitalize">
                                                    {c.platform}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-stone-700 dark:text-stone-300 max-w-[220px] truncate">
                                                {c.productName ?? <span className="text-stone-400 font-mono text-xs">{c.productId}</span>}
                                            </td>
                                            <td className="px-6 py-3 text-stone-500 text-xs">
                                                {c.userEmail ?? <span className="italic text-stone-300 dark:text-stone-600">Khách</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-black/[0.04] dark:border-white/[0.04]">
                                <span className="text-xs text-stone-400">
                                    Trang {page + 1} / {totalPages} · {totalCount} clicks
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => handlePage(-1)} disabled={page === 0}
                                        className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors">
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button onClick={() => handlePage(1)} disabled={page >= totalPages - 1}
                                        className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}