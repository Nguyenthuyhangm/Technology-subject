import { useEffect, useRef, useState } from 'react';
import apiClient from '../../api/apiClient';
import { RefreshCw, AlertTriangle, Clock, Trash2, Activity, Server, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { FONT_STACK } from './adminConstants';

type PlatformStat = {
    platform: string;
    totalListings: number;
    crawledLast24h: number;
    lastCrawlTime?: string;
    errorCount: number;
};

type CrawlerStatus = {
    queue: { high: number; medium: number; low: number };
    errorsToday: number;
    isRunning: boolean;
};

type CrawlError = {
    id: string;
    platform: string;
    productName?: string;
    url?: string;
    errorType: string;
    errorMessage?: string;
    crawledAt: string;
};

const ERROR_TYPE_COLORS: Record<string, string> = {
    BLOCKED:      'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    TIMEOUT:      'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    NOT_FOUND:    'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
    HTML_CHANGED: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    CAPTCHA:      'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
    OTHER:        'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-500',
};

const ERROR_TYPE_LABELS: Record<string, string> = {
    BLOCKED:      'Bị block IP',
    TIMEOUT:      'Timeout',
    NOT_FOUND:    'Không tìm thấy',
    HTML_CHANGED: 'HTML thay đổi',
    CAPTCHA:      'CAPTCHA',
    OTHER:        'Khác',
};

const PLATFORMS = ['all', 'Tiki', 'Watsons', 'Hasaki', 'Guardian', 'Cocolux'];
const PAGE_SIZE = 20;

export default function CrawlerTab() {
    const [status, setStatus] = useState<CrawlerStatus | null>(null);
    const [platformStats, setPlatformStats] = useState<PlatformStat[]>([]);
    const [errors, setErrors] = useState<CrawlError[]>([]);
    const [totalErrors, setTotalErrors] = useState(0);
    const [errorPage, setErrorPage] = useState(0);
    const [statusLoading, setStatusLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [errorsLoading, setErrorsLoading] = useState(false);
    const [triggering, setTriggering] = useState<string | null>(null);
    const [platformFilter, setPlatformFilter] = useState('all');
    const [stopping, setStopping] = useState(false);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const prevIsRunning = useRef<boolean>(false);

    // Fetch status (queue + isRunning) — gọi thường xuyên
    const fetchStatus = () => {
        setStatusLoading(true);
        apiClient.get('/admin/crawler/status')
            .then(res => setStatus(res.data))
            .catch(console.error)
            .finally(() => setStatusLoading(false));
    };

    // Fetch platformStats — chỉ gọi khi cần (nặng)
    const fetchPlatformStats = () => {
        setStatsLoading(true);
        apiClient.get('/admin/crawler/platform-stats')
            .then(res => setPlatformStats(res.data))
            .catch(console.error)
            .finally(() => setStatsLoading(false));
    };

    const fetchErrors = (platform?: string, page = 0) => {
        setErrorsLoading(true);
        const params: Record<string, unknown> = { page, size: PAGE_SIZE };
        if (platform && platform !== 'all') params.platform = platform;
        apiClient.get('/admin/crawler/errors', { params })
            .then(res => {
                setErrors(res.data);
                setTotalErrors(parseInt(res.headers['x-total-count'] ?? '0'));
            })
            .catch(console.error)
            .finally(() => setErrorsLoading(false));
    };

    // Load lần đầu
    useEffect(() => {
        fetchStatus();
        fetchPlatformStats();
        fetchErrors();
    }, []);

    // Polling khi isRunning = true
    // Khi isRunning chuyển true → false: refresh platformStats
    useEffect(() => {
        if (status?.isRunning) {
            if (!pollingRef.current) {
                pollingRef.current = setInterval(fetchStatus, 5000);
            }
        } else {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            // Vừa crawl xong → refresh platformStats
            if (prevIsRunning.current === true) {
                fetchPlatformStats();
                fetchErrors(platformFilter, errorPage);
            }
        }
        prevIsRunning.current = status?.isRunning ?? false;

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [status?.isRunning]);

    const handleTrigger = async (priority: string) => {
        setTriggering(priority);
        try {
            await apiClient.post(`/admin/crawler/trigger/${priority}`);
            setTimeout(fetchStatus, 1000);
        } catch (e) {
            console.error(e);
        } finally {
            setTriggering(null);
        }
    };

    const handleStop = async () => {
        setStopping(true);
        try {
            await apiClient.post('/admin/crawler/stop');
            setTimeout(fetchStatus, 500);
        } catch (e) {
            console.error(e);
        } finally {
            setStopping(false);
        }
    };

    const handleDeleteError = async (id: string) => {
        await apiClient.delete(`/admin/crawler/errors/${id}`);
        setErrors(prev => prev.filter(e => e.id !== id));
        setTotalErrors(prev => prev - 1);
    };

    const handleDeleteAllErrors = async () => {
        const params = platformFilter !== 'all' ? { platform: platformFilter } : {};
        await apiClient.delete('/admin/crawler/errors', { params });
        setErrors([]);
        setTotalErrors(0);
        setErrorPage(0);
    };

    const handlePlatformFilter = (p: string) => {
        setPlatformFilter(p);
        setErrorPage(0);
        fetchErrors(p, 0);
    };

    const handlePageChange = (newPage: number) => {
        setErrorPage(newPage);
        fetchErrors(platformFilter, newPage);
    };

    const formatTime = (iso?: string) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    };

    const totalPages = Math.ceil(totalErrors / PAGE_SIZE);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-stone-900 dark:text-white"
                        style={{ fontFamily: FONT_STACK.serif }}>
                        Crawler
                    </h1>
                    <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                        Theo dõi trạng thái và lỗi crawl dữ liệu
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {status?.isRunning && (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                            Đang chạy
                        </span>
                    )}
                    {status?.isRunning && (
                        <button onClick={handleStop} disabled={stopping}
                            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-red-500 disabled:opacity-40 transition-colors">
                            <Square size={12} strokeWidth={1.5} />
                            {stopping ? 'Đang dừng...' : 'Dừng'}
                        </button>
                    )}
                    <button onClick={() => { fetchStatus(); fetchPlatformStats(); }}
                        className="flex items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-2.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                        <RefreshCw size={13} strokeWidth={1.5} className={statusLoading ? 'animate-spin' : ''} />
                        Làm mới
                    </button>
                </div>
            </div>

            {/* Queue + Trigger */}
            <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-[#121212] overflow-hidden">
                <div className="border-b border-black/[0.04] dark:border-white/[0.04] px-6 py-5">
                    <h2 className="text-sm font-medium text-stone-900 dark:text-white">Hàng đợi crawl</h2>
                </div>
                <div className="grid grid-cols-3 divide-x divide-black/[0.04] dark:divide-white/[0.04]">
                    {[
                        { key: 'high', label: 'HIGH', desc: 'Có price alert', color: '#B7848C' },
                        { key: 'medium', label: 'MEDIUM', desc: 'Trong wishlist', color: '#c89f59' },
                        { key: 'low', label: 'LOW', desc: 'Sản phẩm thường', color: '#64748b' },
                    ].map(q => (
                        <div key={q.key} className="p-6 flex flex-col gap-4">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: q.color }}>
                                    {q.label}
                                </span>
                                <p className="mt-0.5 text-xs text-stone-400">{q.desc}</p>
                                <p className="mt-3 text-3xl font-semibold text-stone-900 dark:text-white">
                                    {status?.queue[q.key as keyof typeof status.queue] ?? '—'}
                                </p>
                                <p className="text-xs text-stone-400 mt-1">listings chờ crawl</p>
                            </div>
                            <button
                                onClick={() => handleTrigger(q.key)}
                                disabled={triggering === q.key || status?.isRunning}
                                className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 transition-colors">
                                {triggering === q.key
                                    ? <RefreshCw size={12} className="animate-spin" />
                                    : <Activity size={12} strokeWidth={1.5} />}
                                {triggering === q.key ? 'Đang chạy...' : 'Trigger'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Platform Stats — chỉ refresh sau khi crawl xong */}
            <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-[#121212] overflow-hidden">
                <div className="border-b border-black/[0.04] dark:border-white/[0.04] px-6 py-5 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-stone-900 dark:text-white">Thống kê theo sàn</h2>
                    <button onClick={fetchPlatformStats}
                        className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors">
                        <RefreshCw size={12} strokeWidth={1.5} className={statsLoading ? 'animate-spin' : ''} />
                        Cập nhật
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                {['Sàn', 'Tổng listings', 'Crawled 24h', 'Crawl gần nhất', 'Lỗi tổng'].map(h => (
                                    <th key={h} className="border-b border-black/[0.04] dark:border-white/[0.04] px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                            {statsLoading ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-stone-400">Đang tải...</td></tr>
                            ) : platformStats.map(p => (
                                <tr key={p.platform} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-900 dark:text-stone-100">
                                        <div className="flex items-center gap-2">
                                            <Server size={14} strokeWidth={1.5} className="text-stone-400" />
                                            {p.platform}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-stone-600 dark:text-stone-400">{p.totalListings}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-medium ${p.crawledLast24h > 0 ? 'text-emerald-600' : 'text-stone-400'}`}>
                                            {p.crawledLast24h}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-stone-400">{formatTime(p.lastCrawlTime)}</td>
                                    <td className="px-6 py-4">
                                        {p.errorCount > 0 ? (
                                            <span className="flex items-center gap-1 text-xs text-red-500">
                                                <AlertTriangle size={12} />
                                                {p.errorCount}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-stone-400">0</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Crawl Errors — có phân trang */}
            <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-[#121212] overflow-hidden">
                <div className="border-b border-black/[0.04] dark:border-white/[0.04] px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-medium text-stone-900 dark:text-white">Log lỗi crawl</h2>
                        {status?.errorsToday ? (
                            <span className="rounded-full bg-red-50 dark:bg-red-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                                {status.errorsToday} lỗi hôm nay
                            </span>
                        ) : null}
                        {totalErrors > 0 && (
                            <button onClick={handleDeleteAllErrors}
                                className="text-[10px] text-red-400 hover:text-red-600 transition-colors">
                                Xóa tất cả
                            </button>
                        )}
                    </div>
                    <div className="flex gap-1 rounded-xl border border-stone-200 dark:border-stone-800 p-1">
                        {PLATFORMS.map(p => (
                            <button key={p}
                                onClick={() => handlePlatformFilter(p)}
                                className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                                    platformFilter === p
                                        ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                                        : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                                }`}>
                                {p === 'all' ? 'Tất cả' : p}
                            </button>
                        ))}
                    </div>
                </div>

                {errorsLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-5 w-5 animate-spin rounded-full border-[1.5px] border-stone-300 border-t-stone-900" />
                    </div>
                ) : errors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <AlertTriangle className="text-stone-300 mb-3" size={24} strokeWidth={1.5} />
                        <p className="text-sm text-stone-500">Không có lỗi nào</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        {['Sàn', 'Sản phẩm', 'Loại lỗi', 'Chi tiết', 'Thời gian', ''].map(h => (
                                            <th key={h} className="border-b border-black/[0.04] dark:border-white/[0.04] px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                                    {errors.map(e => (
                                        <tr key={e.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                                            <td className="px-6 py-4 font-medium text-stone-900 dark:text-stone-100">{e.platform}</td>
                                            <td className="px-6 py-4 max-w-[200px]">
                                                <p className="line-clamp-1 text-stone-600 dark:text-stone-400 text-xs">{e.productName || '—'}</p>
                                                {e.url && (
                                                    <a href={e.url} target="_blank" rel="noopener noreferrer"
                                                        className="text-[10px] text-stone-400 hover:text-[#B7848C] line-clamp-1 transition-colors">
                                                        {e.url}
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${ERROR_TYPE_COLORS[e.errorType] ?? ERROR_TYPE_COLORS.OTHER}`}>
                                                    {ERROR_TYPE_LABELS[e.errorType] ?? e.errorType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 max-w-[250px]">
                                                <p className="line-clamp-2 text-xs text-stone-400">{e.errorMessage || '—'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-stone-400 flex items-center gap-1">
                                                <Clock size={11} strokeWidth={1.5} />
                                                {formatTime(e.crawledAt)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleDeleteError(e.id)}
                                                    className="text-stone-300 hover:text-red-500 dark:text-stone-600 dark:hover:text-red-400 transition-colors">
                                                    <Trash2 size={14} strokeWidth={1.5} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-black/[0.04] dark:border-white/[0.04]">
                                <p className="text-xs text-stone-400">
                                    {errorPage * PAGE_SIZE + 1}–{Math.min((errorPage + 1) * PAGE_SIZE, totalErrors)} / {totalErrors} lỗi
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handlePageChange(errorPage - 1)}
                                        disabled={errorPage === 0}
                                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 disabled:opacity-30 transition-colors">
                                        <ChevronLeft size={14} />
                                    </button>
                                    <span className="text-xs text-stone-500 px-2">
                                        {errorPage + 1} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(errorPage + 1)}
                                        disabled={errorPage >= totalPages - 1}
                                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 disabled:opacity-30 transition-colors">
                                        <ChevronRight size={14} />
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