import { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';
import { Search, Eye, EyeOff, ExternalLink, Package, ChevronDown, Trash2 } from 'lucide-react';
import { FONT_STACK } from './adminConstants';

type ProductItem = {
    listingId: string;
    productId: string;
    productName: string;
    platform: string;
    currentPrice: number;
    status: string;
    inStock: boolean;
    imageUrl?: string;
    url: string;
    crawlTime?: string;
    updatedAt?: string;
};

type OutOfStockStats = {
    over1Month: number;
    over3Months: number;
    over6Months: number;
    over9Months: number;
};

const PLATFORMS = ['all', 'Tiki', 'Watsons', 'Hasaki', 'Guardian', 'Cocolux'];

const OUT_OF_STOCK_MONTHS = [
    { value: 0, label: 'Tất cả hết hàng' },
    { value: 1, label: '> 1 tháng' },
    { value: 3, label: '> 3 tháng' },
    { value: 6, label: '> 6 tháng' },
    { value: 9, label: '> 9 tháng' },
];

export default function ProductsTab() {
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [platform, setPlatform] = useState('all');
    const [status, setStatus] = useState('all');
    const [stock, setStock] = useState('all');
    const [outOfStockMonths, setOutOfStockMonths] = useState(0);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState<OutOfStockStats | null>(null);
    const [isOutOfStockHidden, setIsOutOfStockHidden] = useState(false);
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);
    const [actionResult, setActionResult] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [cleanupMonths, setCleanupMonths] = useState(3);
    const [cleanupConfirm, setCleanupConfirm] = useState(false);
    const PAGE_SIZE = 20;

    const fetchProducts = (p = 0, plat = platform, stat = status, stk = stock, oos = outOfStockMonths) => {
        setLoading(true);
        const params: Record<string, any> = { page: p, size: PAGE_SIZE };
        if (plat !== 'all') params.platform = plat;
        if (stat !== 'all') params.status = stat;
        if (stk !== 'all') params.inStock = stk === 'true';
        if (stk === 'false' && oos > 0) params.outOfStockMonths = oos;
        apiClient.get('/admin/products', { params })
            .then(res => {
                setProducts(res.data);
                setTotal(parseInt(res.headers['x-total-count'] ?? '0'));
                setPage(p);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const fetchStats = () => {
        apiClient.get('/admin/products/out-of-stock-stats')
            .then(res => setStats(res.data))
            .catch(console.error);
    };

    useEffect(() => {
        fetchProducts();
        fetchStats();
    }, []);

    const handlePlatformChange = (plat: string) => { setPlatform(plat); fetchProducts(0, plat, status, stock, outOfStockMonths); };
    const handleStatusChange = (stat: string) => { setStatus(stat); fetchProducts(0, platform, stat, stock, outOfStockMonths); };
    const handleStockChange = (stk: string) => { setStock(stk); setOutOfStockMonths(0); fetchProducts(0, platform, status, stk, 0); };
    const handleOutOfStockMonthsChange = (oos: number) => { setOutOfStockMonths(oos); fetchProducts(0, platform, status, stock, oos); };

    const handleToggleStatus = async (listingId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'hidden' ? 'active' : 'hidden';
        await apiClient.patch(`/admin/products/${listingId}/status`, { status: newStatus });
        setProducts(prev => prev.map(p => p.listingId === listingId ? { ...p, status: newStatus } : p));
    };

    const handleDeleteListing = async (listingId: string) => {
        try {
            const res = await apiClient.delete(`/admin/products/listings/${listingId}`);
            setProducts(prev => prev.filter(p => p.listingId !== listingId));
            setTotal(prev => prev - 1);
            const msg = res.data.productDeleted
                ? `Đã xóa listing và sản phẩm "${res.data.productName}"`
                : `Đã xóa listing`;
            setActionResult(msg);
            setTimeout(() => setActionResult(null), 3000);
        } catch {
            setActionResult('Có lỗi khi xóa');
        }
        setDeleteConfirm(null);
    };

    const handleCleanup = async () => {
        setIsProcessingBatch(true);
        setCleanupConfirm(false);
        try {
            const res = await apiClient.delete(`/admin/products/out-of-stock-cleanup?months=${cleanupMonths}`);
            setActionResult(`Đã xóa ${res.data.listingsDeleted} listings, ${res.data.productsDeleted} sản phẩm`);
            fetchProducts(0, platform, status, stock, outOfStockMonths);
            fetchStats();
        } catch {
            setActionResult('Có lỗi khi cleanup');
        } finally {
            setIsProcessingBatch(false);
            setTimeout(() => setActionResult(null), 4000);
        }
    };

    const handleToggleBatchAction = async () => {
        setIsProcessingBatch(true);
        setActionResult(null);
        try {
            if (isOutOfStockHidden) {
                const res = await apiClient.post('/admin/products/show-out-of-stock');
                setActionResult(`Đã hiện lại ${res.data.shown || 'các'} sản phẩm.`);
                setIsOutOfStockHidden(false);
            } else {
                const res = await apiClient.post('/admin/products/hide-out-of-stock');
                setActionResult(`Đã ẩn ${res.data.hidden || 'các'} sản phẩm hết hàng.`);
                setIsOutOfStockHidden(true);
            }
            fetchProducts(0, platform, status, stock, outOfStockMonths);
        } catch {
            setActionResult('Có lỗi xảy ra khi thao tác.');
        } finally {
            setIsProcessingBatch(false);
            setTimeout(() => setActionResult(null), 4000);
        }
    };

    const filtered = search
        ? products.filter(p => p.productName.toLowerCase().includes(search.toLowerCase()))
        : products;

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Page Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-stone-900 dark:text-white"
                        style={{ fontFamily: FONT_STACK.serif }}>
                        Kho Sản Phẩm
                    </h1>
                    <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                        Quản lý <span className="font-medium text-stone-900 dark:text-white">{total.toLocaleString('vi-VN')}</span> sản phẩm từ các nền tảng bán lẻ.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <button onClick={handleToggleBatchAction} disabled={isProcessingBatch}
                        className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-100 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-200 disabled:opacity-50 transition-all dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 w-[145px] justify-center">
                        {isProcessingBatch ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-stone-400 border-t-stone-700" />
                        ) : isOutOfStockHidden ? <Eye size={14} strokeWidth={1.5} /> : <EyeOff size={14} strokeWidth={1.5} />}
                        <span>{isProcessingBatch ? 'Đang xử lý...' : isOutOfStockHidden ? 'Hiện lại hàng' : 'Ẩn hết hàng'}</span>
                    </button>
                    {actionResult && <p className="text-[11px] text-stone-500 dark:text-stone-400">{actionResult}</p>}
                </div>
            </div>

            {/* Out-of-stock stats + cleanup */}
            {stats && (
                <div className="mb-6 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-[#121212] overflow-hidden">
                    <div className="border-b border-black/[0.04] dark:border-white/[0.04] px-6 py-4 flex items-center justify-between">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Thống kê hết hàng lâu ngày</h2>
                        {/* Cleanup */}
                        <div className="flex items-center gap-3">
                            {cleanupConfirm ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-stone-500">Xóa hết hàng &gt; {cleanupMonths} tháng?</span>
                                    <button onClick={handleCleanup} disabled={isProcessingBatch}
                                        className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors">Xác nhận</button>
                                    <button onClick={() => setCleanupConfirm(false)}
                                        className="text-[11px] text-stone-400 hover:text-stone-600 transition-colors">Hủy</button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <select value={cleanupMonths} onChange={e => setCleanupMonths(Number(e.target.value))}
                                        className="appearance-none rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 py-1 pl-3 pr-8 text-[11px] text-stone-600 dark:text-stone-400 outline-none">
                                        <option value={1}>1 tháng</option>
                                        <option value={3}>3 tháng</option>
                                        <option value={6}>6 tháng</option>
                                        <option value={9}>9 tháng</option>
                                    </select>
                                    <button onClick={() => setCleanupConfirm(true)}
                                        className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 hover:text-red-500 transition-colors">
                                        <Trash2 size={12} strokeWidth={1.5} />
                                        Dọn dẹp
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 divide-x divide-black/[0.04] dark:divide-white/[0.04]">
                        {[
                            { label: '> 1 tháng', value: stats.over1Month, months: 1 },
                            { label: '> 3 tháng', value: stats.over3Months, months: 3 },
                            { label: '> 6 tháng', value: stats.over6Months, months: 6 },
                            { label: '> 9 tháng', value: stats.over9Months, months: 9 },
                        ].map(s => (
                            <button key={s.months}
                                onClick={() => { setStock('false'); handleOutOfStockMonthsChange(s.months); }}
                                className={`p-4 text-left transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01] ${outOfStockMonths === s.months && stock === 'false' ? 'bg-black/[0.02] dark:bg-white/[0.02]' : ''}`}>
                                <p className="text-xs text-stone-400">{s.label}</p>
                                <p className={`mt-1 text-xl font-semibold ${s.value > 0 ? 'text-red-500' : 'text-stone-400'}`}>
                                    {s.value}
                                </p>
                                <p className="text-[10px] text-stone-400 mt-0.5">listings</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Container */}
            <div className="rounded-2xl border border-black/[0.04] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.01)] dark:border-white/[0.04] dark:bg-[#121212] overflow-hidden">

                {/* Toolbar */}
                <div className="flex flex-col gap-4 border-b border-black/[0.04] bg-stone-50/50 p-4 dark:border-white/[0.04] dark:bg-[#161413]/50 sm:flex-row sm:items-center">
                    <form onSubmit={(e) => e.preventDefault()} className="relative flex-1">
                        <Search size={14} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Tìm kiếm sản phẩm..."
                            className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-10 pr-4 text-xs font-medium text-stone-900 placeholder-stone-400 outline-none transition-all focus:border-[#B7848C] focus:ring-1 focus:ring-[#B7848C] dark:border-stone-800 dark:bg-[#1A1817] dark:text-white dark:placeholder-stone-600" />
                    </form>
                    <div className="flex items-center flex-wrap gap-3">
                        {/* Platform */}
                        <div className="relative">
                            <select value={platform} onChange={e => handlePlatformChange(e.target.value)}
                                className="appearance-none cursor-pointer rounded-xl border border-stone-200 bg-white py-2 pl-4 pr-10 text-xs font-medium text-stone-700 outline-none hover:bg-stone-50 focus:border-[#B7848C] dark:border-stone-800 dark:bg-[#1A1817] dark:text-stone-300">
                                {PLATFORMS.map(p => <option key={p} value={p}>{p === 'all' ? 'Tất cả nền tảng' : p}</option>)}
                            </select>
                            <ChevronDown size={14} strokeWidth={2} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        </div>
                        {/* Stock */}
                        <div className="relative">
                            <select value={stock} onChange={e => handleStockChange(e.target.value)}
                                className="appearance-none cursor-pointer rounded-xl border border-stone-200 bg-white py-2 pl-4 pr-10 text-xs font-medium text-stone-700 outline-none hover:bg-stone-50 focus:border-[#B7848C] dark:border-stone-800 dark:bg-[#1A1817] dark:text-stone-300">
                                <option value="all">Tất cả tồn kho</option>
                                <option value="true">Còn hàng</option>
                                <option value="false">Hết hàng</option>
                            </select>
                            <ChevronDown size={14} strokeWidth={2} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        </div>
                        {/* Out of stock months - chỉ hiện khi chọn hết hàng */}
                        {stock === 'false' && (
                            <div className="relative">
                                <select value={outOfStockMonths} onChange={e => handleOutOfStockMonthsChange(Number(e.target.value))}
                                    className="appearance-none cursor-pointer rounded-xl border border-red-200 bg-red-50 py-2 pl-4 pr-10 text-xs font-medium text-red-700 outline-none hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                                    {OUT_OF_STOCK_MONTHS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <ChevronDown size={14} strokeWidth={2} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />
                            </div>
                        )}
                        {/* Status */}
                        <div className="relative">
                            <select value={status} onChange={e => handleStatusChange(e.target.value)}
                                className="appearance-none cursor-pointer rounded-xl border border-stone-200 bg-white py-2 pl-4 pr-10 text-xs font-medium text-stone-700 outline-none hover:bg-stone-50 focus:border-[#B7848C] dark:border-stone-800 dark:bg-[#1A1817] dark:text-stone-300">
                                <option value="all">Tất cả trạng thái</option>
                                <option value="active">Đang hiển thị</option>
                                <option value="hidden">Đã ẩn</option>
                            </select>
                            <ChevronDown size={14} strokeWidth={2} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        </div>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="h-5 w-5 animate-spin rounded-full border-[1.5px] border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-white" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-stone-50 dark:bg-stone-800/50">
                            <Package className="text-stone-300 dark:text-stone-600" size={24} strokeWidth={1} />
                        </div>
                        <p className="text-sm font-medium text-stone-900 dark:text-white">Không có sản phẩm</p>
                        <p className="mt-1.5 text-xs text-stone-500">Thử thay đổi từ khóa hoặc bộ lọc của bạn.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    <th className="border-b border-black/[0.04] px-8 py-5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Sản phẩm</th>
                                    <th className="border-b border-black/[0.04] px-6 py-5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Giá hiện tại</th>
                                    <th className="border-b border-black/[0.04] px-6 py-5 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Tồn kho</th>
                                    <th className="border-b border-black/[0.04] px-6 py-5 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Hiển thị</th>
                                    <th className="border-b border-black/[0.04] px-6 py-5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Cập nhật</th>
                                    <th className="border-b border-black/[0.04] px-8 py-5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                                {filtered.map(p => (
                                    <tr key={p.listingId} className={`group transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01] ${p.status === 'hidden' ? 'opacity-60 grayscale-[0.2]' : ''}`}>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/[0.04] bg-stone-50 dark:border-white/[0.04] dark:bg-stone-800/50">
                                                    {p.imageUrl ? (
                                                        <img src={p.imageUrl} alt={p.productName} className="h-full w-full object-cover mix-blend-multiply dark:mix-blend-normal" />
                                                    ) : (
                                                        <Package size={18} className="text-stone-300" strokeWidth={1.5} />
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="line-clamp-2 max-w-[280px] font-medium text-stone-900 dark:text-stone-100">{p.productName}</span>
                                                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-widest text-[#B7848C] hover:text-stone-900 dark:hover:text-white transition-colors">
                                                        {p.platform} <ExternalLink size={10} strokeWidth={2} />
                                                    </a>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <span className="font-medium text-stone-900 dark:text-stone-100">
                                                {p.currentPrice ? `${p.currentPrice.toLocaleString('vi-VN')}₫` : '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`text-xs font-medium ${p.inStock ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {p.inStock ? 'Còn hàng' : 'Hết hàng'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="text-xs text-stone-600 dark:text-stone-400">
                                                {p.status === 'active' ? 'Hiển thị' : 'Đã ẩn'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-stone-400 dark:text-stone-500">
                                            {p.crawlTime ? new Date(p.crawlTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button onClick={() => handleToggleStatus(p.listingId, p.status)}
                                                    title={p.status === 'hidden' ? 'Hiện sản phẩm' : 'Ẩn sản phẩm'}
                                                    className={`transition-colors ${p.status === 'hidden' ? 'text-stone-400 hover:text-[#B7848C]' : 'text-stone-300 hover:text-stone-700 dark:text-stone-600 dark:hover:text-stone-300'}`}>
                                                    {p.status === 'hidden' ? <Eye size={15} strokeWidth={1.5} /> : <EyeOff size={15} strokeWidth={1.5} />}
                                                </button>
                                                {deleteConfirm === p.listingId ? (
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => handleDeleteListing(p.listingId)}
                                                            className="text-[10px] font-semibold text-red-500 hover:text-red-700 transition-colors">Xóa</button>
                                                        <button onClick={() => setDeleteConfirm(null)}
                                                            className="text-[10px] text-stone-400 hover:text-stone-600 transition-colors">Hủy</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setDeleteConfirm(p.listingId)}
                                                        className="text-stone-300 hover:text-red-500 dark:text-stone-600 dark:hover:text-red-400 transition-colors">
                                                        <Trash2 size={15} strokeWidth={1.5} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between border-t border-black/[0.04] dark:border-white/[0.04] pt-6">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Trang {page + 1} / {totalPages}</span>
                    <div className="flex gap-4">
                        <button disabled={page === 0} onClick={() => fetchProducts(page - 1)}
                            className="text-[11px] font-semibold uppercase tracking-wider text-stone-900 disabled:text-stone-300 dark:text-white dark:disabled:text-stone-700 transition-colors hover:text-[#B7848C]">← Trước</button>
                        <button disabled={page >= totalPages - 1} onClick={() => fetchProducts(page + 1)}
                            className="text-[11px] font-semibold uppercase tracking-wider text-stone-900 disabled:text-stone-300 dark:text-white dark:disabled:text-stone-700 transition-colors hover:text-[#B7848C]">Tiếp →</button>
                    </div>
                </div>
            )}
        </div>
    );
}