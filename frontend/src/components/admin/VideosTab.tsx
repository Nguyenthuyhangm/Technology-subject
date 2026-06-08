import { useEffect, useState } from 'react';
import { Play, X, ExternalLink, ChevronLeft, RefreshCw, Film } from 'lucide-react';
import { FONT_STACK } from './adminConstants';
import { getVideoSummary, getVideoDetails, deleteVideo } from '../../service/ProductService';
import type { VideoSummary, VideoDetail } from '../../types/product';

export default function VideosTab() {
    const [summary, setSummary] = useState<VideoSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<VideoSummary | null>(null);
    const [details, setDetails] = useState<VideoDetail[]>([]);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchSummary = () => {
        setLoading(true);
        getVideoSummary()
            .then(setSummary)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchSummary(); }, []);

    const handleViewDetails = async (product: VideoSummary) => {
        setSelectedProduct(product);
        setDetailsLoading(true);
        try {
            const data = await getVideoDetails(product.productId);
            setDetails(data);
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
            fetchSummary();
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

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-stone-900 dark:text-white"
                        style={{ fontFamily: FONT_STACK.serif }}>
                        Videos
                    </h1>
                    <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                        Quản lý video đã crawl theo sản phẩm
                    </p>
                </div>
                <button onClick={fetchSummary}
                    className="flex items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-2.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                    <RefreshCw size={13} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
                    Làm mới
                </button>
            </div>

            {/* Table tổng hợp */}
            <div className="rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-[#121212] overflow-hidden">
                <div className="border-b border-black/[0.04] dark:border-white/[0.04] px-6 py-5">
                    <h2 className="text-sm font-medium text-stone-900 dark:text-white">Danh sách sản phẩm đã crawl video</h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-5 w-5 animate-spin rounded-full border-[1.5px] border-stone-300 border-t-stone-900" />
                    </div>
                ) : summary.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Film className="text-stone-300 mb-3" size={24} strokeWidth={1.5} />
                        <p className="text-sm text-stone-500">Chưa có video nào được crawl</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    {['Sản phẩm', 'Số lượng video', 'Crawl gần nhất', 'Hành động'].map(h => (
                                        <th key={h} className="border-b border-black/[0.04] dark:border-white/[0.04] px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                                {summary.map(item => (
                                    <tr key={item.productId}
                                        className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                                        <td className="px-6 py-4 font-medium text-stone-900 dark:text-stone-100 max-w-[300px]">
                                            <p className="line-clamp-2">{item.productName}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="rounded-full bg-[#B7848C]/10 px-2.5 py-1 text-[11px] font-semibold text-[#B7848C]">
                                                {item.videoCount} video
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-stone-400">
                                            {formatDate(item.latestCrawlDate)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleViewDetails(item)}
                                                className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-700 px-3 py-1.5 text-[11px] font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
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
                                    <h3 className="text-sm font-medium text-stone-900 dark:text-white">
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
                                    <div className="h-5 w-5 animate-spin rounded-full border-[1.5px] border-stone-300 border-t-stone-900" />
                                </div>
                            ) : details.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <Film className="text-stone-300 mb-3" size={24} strokeWidth={1.5} />
                                    <p className="text-sm text-stone-500">Không có video nào</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr>
                                                {['Thumbnail', 'Title', 'Ngày crawl', 'Link', ''].map(h => (
                                                    <th key={h} className="border-b border-black/[0.04] dark:border-white/[0.04] px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                                            {details.map(detail => {
                                                const thumbnail = detail.thumbnailUrl || getYouTubeThumbnail(detail.videoUrl);
                                                return (
                                                    <tr key={detail.videoId}
                                                        className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                                                        <td className="px-6 py-4 w-28">
                                                            {thumbnail ? (
                                                                <img src={thumbnail}
                                                                    alt={detail.title}
                                                                    className="w-16 h-10 object-cover rounded-lg" />
                                                            ) : (
                                                                <div className="w-16 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                                                                    <Film size={16} className="text-stone-400" />
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 max-w-[250px]">
                                                            <p className="line-clamp-2 text-stone-900 dark:text-stone-100">
                                                                {detail.title}
                                                            </p>
                                                            {detail.youtubeId && (
                                                                <p className="text-[10px] text-stone-400 mt-1">
                                                                    YouTube: {detail.youtubeId}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-stone-400 whitespace-nowrap">
                                                            {formatDate(detail.createdAt)}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <a href={detail.videoUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 text-[11px] font-medium text-[#B7848C] hover:text-[#9a6b74] transition-colors">
                                                                Xem
                                                                <ExternalLink size={11} strokeWidth={1.5} />
                                                            </a>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => handleDelete(detail.videoId)}
                                                                disabled={deleting === detail.videoId}
                                                                className="text-stone-300 hover:text-red-500 dark:text-stone-600 dark:hover:text-red-400 disabled:opacity-40 transition-colors">
                                                                {deleting === detail.videoId ? (
                                                                    <RefreshCw size={14} className="animate-spin" />
                                                                ) : (
                                                                    <X size={14} strokeWidth={1.5} />
                                                                )}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
