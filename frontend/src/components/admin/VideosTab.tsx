import { useCallback, useEffect, useState } from 'react';
import { Play, X, RefreshCw, Film, ChevronLeft, ChevronLeftIcon, ChevronRightIcon, Search } from 'lucide-react';
import { FONT_STACK } from './adminConstants';
import { getVideoSummary, getVideoDetails, deleteVideo } from '../../service/ProductService';
import type { VideoSummary, VideoDetail } from '../../types/product';

export default function VideosTab() {
    const [summary, setSummary] = useState<VideoSummary[]>([]);
    const [summaryTotal, setSummaryTotal] = useState(0);
    const [summaryPage, setSummaryPage] = useState(0);
    const [summarySize] = useState(20);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<VideoSummary | null>(null);
    const [details, setDetails] = useState<VideoDetail[]>([]);
    const [detailsTotal, setDetailsTotal] = useState(0);
    const [detailsPage, setDetailsPage] = useState(0);
    const [detailsSize] = useState(20);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchSummary = useCallback(async (page: number, searchTerm: string) => {
        setLoading(true);
        try {
            const response = await getVideoSummary(page, summarySize, searchTerm || undefined);
            setSummary(response.data);
            setSummaryTotal(Number(response.headers['x-total-count'] || response.data.length));
            setSummaryPage(page);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [summarySize]);

    useEffect(() => {
        fetchSummary(0, '');
    }, [fetchSummary]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
        fetchSummary(0, searchInput);
    };

    const handleClearSearch = () => {
        setSearchInput('');
        setSearch('');
        fetchSummary(0, '');
    };

    const handleViewDetails = async (product: VideoSummary) => {
        setSelectedProduct(product);
        setDetailsPage(0);
        setDetailsLoading(true);
        try {
            const response = await getVideoDetails(product.productId, 0, detailsSize);
            setDetails(response.data);
            setDetailsTotal(Number(response.headers['x-total-count'] || response.data.length));
        } catch (e) {
            console.error(e);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleDetailsPageChange = async (page: number) => {
        if (!selectedProduct) return;
        setDetailsLoading(true);
        try {
            const response = await getVideoDetails(selectedProduct.productId, page, detailsSize);
            setDetails(response.data);
            setDetailsPage(page);
        } catch (e) {
            console.error(e);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleDelete = async (videoId: string) => {
        if (!confirm('Xóa video này?')) return;
        setDeleting(videoId);
        try {
            await deleteVideo(videoId);
            setDetails(prev => prev.filter(d => d.videoId !== videoId));
            fetchSummary(summaryPage, search);
        } catch (e) {
            console.error(e);
        } finally {
            setDeleting(null);
        }
    };

    const handleCloseModal = () => {
        setSelectedProduct(null);
        setDetails([]);
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    const getYouTubeThumbnail = (videoUrl: string) => {
        const match = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
        if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
        return null;
    };

    const summaryTotalPages = Math.ceil(summaryTotal / summarySize) || 1;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Page Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-stone-900 dark:text-white"
                        style={{ fontFamily: FONT_STACK.serif }}>
                        Videos
                    </h1>
                    <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                        Quản lý video đã crawl theo sản phẩm
                        {summaryTotal > 0 && (
                            <span className="ml-1.5">
                                — tổng cộng <span className="font-medium text-stone-900 dark:text-white">{summaryTotal}</span> sản phẩm
                            </span>
                        )}
                    </p>
                </div>
                <button onClick={() => fetchSummary(0, search)}
                    className="flex items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-2.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                    <RefreshCw size={13} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
                    Làm mới
                </button>
            </div>

            {/* Main Container */}
            <div className="rounded-2xl border border-black/[0.04] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.01)] dark:border-white/[0.04] dark:bg-[#121212] overflow-hidden">

                {/* Toolbar */}
                <div className="flex flex-col gap-4 border-b border-black/[0.04] bg-stone-50/50 p-4 dark:border-white/[0.04] dark:bg-[#161413]/50 sm:flex-row sm:items-center">
                    <form onSubmit={handleSearch} className="relative flex-1">
                        <Search size={14} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Tìm kiếm sản phẩm..."
                            className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-10 pr-4 text-xs font-medium text-stone-900 placeholder-stone-400 outline-none transition-all focus:border-[#B7848C] focus:ring-1 focus:ring-[#B7848C] dark:border-stone-800 dark:bg-[#1A1817] dark:text-white dark:placeholder-stone-600" />
                    </form>
                    {search && (
                        <button onClick={handleClearSearch}
                            className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors whitespace-nowrap">
                            <X size={12} strokeWidth={2} />
                            Xóa lọc
                        </button>
                    )}
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="h-5 w-5 animate-spin rounded-full border-[1.5px] border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-white" />
                    </div>
                ) : summary.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-stone-50 dark:bg-stone-800/50">
                            <Film className="text-stone-300 dark:text-stone-600" size={24} strokeWidth={1} />
                        </div>
                        <p className="text-sm font-medium text-stone-900 dark:text-white">
                            {search ? 'Không tìm thấy sản phẩm nào' : 'Chưa có video nào được crawl'}
                        </p>
                        <p className="mt-1.5 text-xs text-stone-500">
                            {search ? 'Thử từ khóa khác.' : 'Các sản phẩm được crawl video sẽ hiển thị tại đây.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    <th className="border-b border-black/[0.04] px-8 py-5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Sản phẩm</th>
                                    <th className="border-b border-black/[0.04] px-6 py-5 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Video</th>
                                    <th className="border-b border-black/[0.04] px-6 py-5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Crawl gần nhất</th>
                                    <th className="border-b border-black/[0.04] px-8 py-5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                                {summary.map(item => (
                                    <tr key={item.productId}
                                        className="group transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                                        <td className="px-8 py-5 max-w-[280px]">
                                            <p className="line-clamp-2 font-medium text-stone-900 dark:text-stone-100">{item.productName}</p>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="rounded-full bg-[#B7848C]/10 px-2.5 py-1 text-[11px] font-semibold text-[#B7848C]">
                                                {item.videoCount} video
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-stone-400 whitespace-nowrap">
                                            {formatDate(item.latestCrawlDate)}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button
                                                onClick={() => handleViewDetails(item)}
                                                className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-700 px-3 py-1.5 text-[11px] font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors ml-auto">
                                                <Play size={12} strokeWidth={1.5} />
                                                Xem video
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {summaryTotalPages > 1 && (
                <div className="mt-8 flex items-center justify-between border-t border-black/[0.04] dark:border-white/[0.04] pt-6">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
                        Trang {summaryPage + 1} / {summaryTotalPages}
                        {search && <span className="ml-2 text-stone-400">— tìm: "{search}"</span>}
                    </span>
                    <div className="flex gap-4">
                        <button disabled={summaryPage === 0} onClick={() => fetchSummary(summaryPage - 1, search)}
                            className="text-[11px] font-semibold uppercase tracking-wider text-stone-900 disabled:text-stone-300 dark:text-white dark:disabled:text-stone-700 transition-colors hover:text-[#B7848C]">
                            ← Trước
                        </button>
                        <button disabled={summaryPage >= summaryTotalPages - 1} onClick={() => fetchSummary(summaryPage + 1, search)}
                            className="text-[11px] font-semibold uppercase tracking-wider text-stone-900 disabled:text-stone-300 dark:text-white dark:disabled:text-stone-700 transition-colors hover:text-[#B7848C]">
                            Tiếp →
                        </button>
                    </div>
                </div>
            )}

            {/* Modal chi tiết */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl bg-white dark:bg-[#121212] border border-black/[0.06] dark:border-white/[0.06] overflow-hidden shadow-2xl flex flex-col">

                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.04] dark:border-white/[0.04]">
                            <div className="flex items-center gap-3">
                                <button onClick={handleCloseModal}
                                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                                    <ChevronLeft size={18} strokeWidth={1.5} />
                                </button>
                                <div>
                                    <h3 className="text-sm font-medium text-stone-900 dark:text-white line-clamp-1">
                                        {selectedProduct.productName}
                                    </h3>
                                    <p className="text-xs text-stone-400 mt-0.5">
                                        {selectedProduct.videoCount} video đã crawl
                                    </p>
                                </div>
                            </div>
                            <button onClick={handleCloseModal}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                                <X size={18} strokeWidth={1.5} />
                            </button>
                        </div>

                        {/* Modal content */}
                        <div className="overflow-y-auto flex-1">
                            {detailsLoading ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="h-5 w-5 animate-spin rounded-full border-[1.5px] border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-white" />
                                </div>
                            ) : details.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <Film className="text-stone-300 mb-3" size={24} strokeWidth={1.5} />
                                    <p className="text-sm text-stone-500">Không có video nào</p>
                                </div>
                            ) : (
                                <div className="p-6">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-4">
                                        Video về sản phẩm
                                    </p>
                                    <div className="grid grid-cols-4 gap-3">
                                        {details.map(detail => {
                                            const thumbnail = detail.thumbnailUrl || getYouTubeThumbnail(detail.videoUrl);
                                            return (
                                                <div key={detail.videoId} className="group relative">
                                                    <a href={detail.videoUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block">
                                                        {thumbnail ? (
                                                            <img src={thumbnail}
                                                                alt={detail.title}
                                                                className="w-full aspect-video object-cover rounded-lg" />
                                                        ) : (
                                                            <div className="w-full aspect-video rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                                                                <Film size={20} className="text-stone-400" />
                                                            </div>
                                                        )}
                                                        <p className="mt-2 line-clamp-2 text-[11px] text-stone-700 dark:text-stone-300 leading-snug">
                                                            {detail.title}
                                                        </p>
                                                    </a>
                                                    <button
                                                        onClick={() => handleDelete(detail.videoId)}
                                                        disabled={deleting === detail.videoId}
                                                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/40 hover:bg-red-500 text-white text-stone-300 disabled:opacity-40 transition-colors opacity-0 group-hover:opacity-100">
                                                        {deleting === detail.videoId ? (
                                                            <RefreshCw size={10} className="animate-spin" />
                                                        ) : (
                                                            <X size={10} strokeWidth={2} />
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Pagination for details */}
                        {detailsTotal > detailsSize && (
                            <div className="flex items-center justify-between border-t border-black/[0.04] dark:border-white/[0.04] px-6 py-4">
                                <p className="text-xs text-stone-500">
                                    Hiển thị {detailsPage * detailsSize + 1}-{Math.min((detailsPage + 1) * detailsSize, detailsTotal)} / {detailsTotal} video
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDetailsPageChange(detailsPage - 1)}
                                        disabled={detailsPage === 0}
                                        className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                                        <ChevronLeftIcon size={14} />
                                    </button>
                                    <span className="text-xs text-stone-600 dark:text-stone-400">
                                        Trang {detailsPage + 1} / {Math.ceil(detailsTotal / detailsSize)}
                                    </span>
                                    <button
                                        onClick={() => handleDetailsPageChange(detailsPage + 1)}
                                        disabled={(detailsPage + 1) * detailsSize >= detailsTotal}
                                        className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                                        <ChevronRightIcon size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
