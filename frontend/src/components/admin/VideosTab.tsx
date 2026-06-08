import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../../api/apiClient';
import { FONT_STACK } from './adminConstants';

type VideoItem = {
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl: string | null;
    publicId: string;
    duration: number;
    createdAt: string;
    createdBy: string | null;
    productIds: string[];
    productNames: string[];
    productCount: number;
    status: string;
};

type VideosResponse = {
    videos: VideoItem[];
    total: number;
    pages: number;
    page: number;
    size: number;
    totalProducts: number;
};

type SelectedProduct = {
    id: string;
    name: string;
    brandName?: string;
    imageUrl?: string;
};

type UploadedVideo = {
    videoUrl: string;
    publicId: string;
    thumbnailUrl: string;
    duration: number;
};

type ModalState = {
    mode: 'add' | 'edit';
    open: boolean;
    video: VideoItem | null;
};

declare global {
    interface Window {
        cloudinary?: any;
    }
}

export default function VideosTab() {
    const PAGE_SIZE = 10;
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [total, setTotal] = useState(0);
    const [totalProducts, setTotalProducts] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [actionResult, setActionResult] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const [modal, setModal] = useState<ModalState>({ mode: 'add', open: false, video: null });
    const [form, setForm] = useState({
        title: '',
        productIds: [] as string[],
        uploaded: null as UploadedVideo | null,
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<SelectedProduct[]>([]);
    const [productDropdownOpen, setProductDropdownOpen] = useState(false);
    const productSearchRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const fetchVideosPage = useCallback(async (page: number, search: string, append: boolean) => {
        if (append) setLoadingMore(true);
        else setLoading(true);
        try {
            const res = await apiClient.get<VideosResponse>('/admin/videos', {
                params: { page, size: PAGE_SIZE, search: search || undefined }
            });
            const data = res.data;
            if (append) {
                setVideos(prev => [...prev, ...data.videos]);
            } else {
                setVideos(data.videos);
            }
            setTotal(data.total);
            setTotalProducts(data.totalProducts);
            setHasMore((page + 1) * PAGE_SIZE < data.total);
            setCurrentPage(page);
        } catch { setActionResult('Không tải được danh sách video'); }
        finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    const fetchVideos = useCallback(() => {
        fetchVideosPage(0, searchQuery, false);
    }, [fetchVideosPage, searchQuery]);

    useEffect(() => { fetchVideos(); }, [fetchVideos]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                    fetchVideosPage(currentPage + 1, searchQuery, true);
                }
            },
            { rootMargin: '100px' }
        );
        const sentinel = sentinelRef.current;
        if (sentinel) observer.observe(sentinel);
        return () => { if (sentinel) observer.unobserve(sentinel); };
    }, [hasMore, loadingMore, loading, currentPage, searchQuery, fetchVideosPage]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) {
                setProductDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            fetchVideosPage(0, value, false);
        }, 400);
    };

    const openAdd = () => {
        setForm({ title: '', productIds: [], uploaded: null });
        setErrors({});
        setProductSearch('');
        setProductResults([]);
        setModal({ mode: 'add', open: true, video: null });
    };

    const openEdit = (video: VideoItem) => {
        setForm({ title: video.title, productIds: video.productIds, uploaded: null });
        setErrors({});
        setProductSearch('');
        setProductResults([]);
        setModal({ mode: 'edit', open: true, video });
    };

    const closeModal = () => {
        setModal({ ...modal, open: false, video: null });
        setForm({ title: '', productIds: [], uploaded: null });
        setErrors({});
        setProductSearch('');
        setProductResults([]);
    };

    const searchProducts = (q: string) => {
        clearTimeout(searchTimeoutRef.current);
        if (!q.trim()) { setProductResults([]); setProductDropdownOpen(false); return; }
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await apiClient.get('/products/search', { params: { q } });
                const raw = res.data as any[];
                const found: SelectedProduct[] = raw.slice(0, 10).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    brandName: p.brandName,
                    imageUrl: p.imageUrl,
                }));
                const filtered = found.filter((p: SelectedProduct) => !form.productIds.includes(p.id));
                setProductResults(filtered);
                setProductDropdownOpen(filtered.length > 0);
            } catch { /* silent */ }
        }, 350);
    };

    const addProduct = (product: SelectedProduct) => {
        if (form.productIds.includes(product.id)) return;
        setForm(prev => ({ ...prev, productIds: [...prev.productIds, product.id] }));
        setProductSearch('');
        setProductResults([]);
        setProductDropdownOpen(false);
    };

    const removeProduct = (id: string) => {
        setForm(prev => ({ ...prev, productIds: prev.productIds.filter(pid => pid !== id) }));
    };

    const openCloudinaryWidget = () => {
        if (!window.cloudinary) {
            const script = document.createElement('script');
            script.src = 'https://upload-widget.cloudinary.com/global/all.js';
            script.onload = () => openCloudinaryWidget();
            document.body.appendChild(script);
            return;
        }
        window.cloudinary.createUploadWidget(
            {
                cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo',
                uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default',
                sources: ['local', 'camera'],
                resourceType: 'video',
                folder: 'pricehawl/videos',
                maxFileSize: 20000000,
                maxVideoDuration: 10,
                clientAllowedFormats: ['mp4', 'webm'],
                showAdvancedOptions: false,
                cropping: false,
                multiple: false,
            },
            (error: any, result: any) => {
                if (result?.event === 'success') {
                    const info = result.info;
                    setForm(prev => ({
                        ...prev,
                        uploaded: {
                            videoUrl: info.secure_url,
                            publicId: info.public_id,
                            thumbnailUrl: info.thumbnail_url || '',
                            duration: Math.round(info.duration || 0),
                        },
                    }));
                    setErrors(prev => { const n = { ...prev }; delete n.upload; return n; });
                }
                if (error) {
                    setErrors(prev => ({ ...prev, upload: 'Upload thất bại: ' + (error.message || 'lỗi không xác định') }));
                }
            }
        ).open();
    };

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!form.title.trim()) errs.title = 'Tiêu đề không được trống';
        if (form.productIds.length === 0) errs.products = 'Chọn ít nhất 1 sản phẩm';
        if (modal.mode === 'add' && !form.uploaded) errs.upload = 'Vui lòng tải lên video';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        setErrors({});
        try {
            if (modal.mode === 'add') {
                await apiClient.post('/admin/videos', {
                    title: form.title.trim(),
                    videoUrl: form.uploaded!.videoUrl,
                    publicId: form.uploaded!.publicId,
                    thumbnailUrl: form.uploaded!.thumbnailUrl,
                    duration: form.uploaded!.duration,
                    productIds: form.productIds,
                });
                setActionResult('Video đã được tải lên thành công');
            } else if (modal.video) {
                await apiClient.patch(`/admin/videos/${modal.video.id}`, {
                    title: form.title.trim(),
                    productIds: form.productIds,
                });
                setActionResult('Video đã được cập nhật');
            }
            fetchVideos();
            closeModal();
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.response?.data?.error || 'Có lỗi xảy ra';
            setErrors({ submit: msg });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (videoId: string) => {
        try {
            await apiClient.delete(`/admin/videos/${videoId}`);
            setVideos(prev => prev.filter(v => v.id !== videoId));
            setTotal(prev => prev - 1);
            setActionResult('Đã xóa video');
            setTimeout(() => setActionResult(null), 3000);
        } catch {
            setActionResult('Xóa thất bại');
        }
        setDeleteConfirm(null);
    };

    const formatDuration = (s: number) => `${s}s`;
    const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const getExt = (url: string) => {
        const ext = url.split('.').pop()?.toLowerCase().split('?')[0];
        return ext === 'mp4' ? 'MP4' : ext === 'webm' ? 'WebM' : (ext ?? '').toUpperCase();
    };

    const getSelectedProductNames = (ids: string[]): string[] => {
        const nameMap: Record<string, string> = {};
        if (modal.video) {
            modal.video.productIds.forEach((pid, i) => {
                nameMap[pid] = modal.video!.productNames[i] || pid;
            });
        }
        return ids.map(id => nameMap[id] || id);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-stone-900 dark:text-white"
                        style={{ fontFamily: FONT_STACK.serif }}>
                        Video giới thiệu sản phẩm
                    </h1>
                    <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                        <span className="font-medium text-stone-900 dark:text-white">{total}</span> video
                        {totalProducts > 0 && (
                            <> · <span className="font-medium text-stone-900 dark:text-white">{totalProducts}</span> sản phẩm liên kết</>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {actionResult && <p className="text-[11px] text-stone-500 dark:text-stone-400">{actionResult}</p>}
                    <button onClick={openAdd}
                        className="flex items-center gap-2 rounded-xl bg-[#B7848C] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#a3737a]">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add new video
                    </button>
                </div>
            </div>

            {/* Search */}
            {videos.length > 0 && (
                <div className="mb-4">
                    <div className="relative max-w-sm">
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <input value={searchQuery} onChange={e => handleSearchChange(e.target.value)}
                            placeholder="Tìm kiếm video..."
                            className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-10 pr-4 text-xs font-medium text-stone-900 placeholder-stone-400 outline-none transition-all focus:border-[#B7848C] focus:ring-1 focus:ring-[#B7848C] dark:border-stone-800 dark:bg-[#1A1817] dark:text-white dark:placeholder-stone-600" />
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl border border-black/[0.04] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.01)] dark:border-white/[0.04] dark:bg-[#121212] overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <div className="h-5 w-5 animate-spin rounded-full border-[1.5px] border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-white" />
                    </div>
                ) : videos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-stone-50 dark:bg-stone-800/50">
                            <svg className="h-6 w-6 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-stone-900 dark:text-white">Chưa có video nào</p>
                        <p className="mt-1.5 text-xs text-stone-500">Bấm "Add new video" để tải lên video đầu tiên.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="border-b border-black/[0.04] px-6 py-5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">#</th>
                                        <th className="border-b border-black/[0.04] px-6 py-5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Tiêu đề video</th>
                                        <th className="border-b border-black/[0.04] px-6 py-5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Sản phẩm liên kết</th>
                                        <th className="border-b border-black/[0.04] px-6 py-5 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Thời lượng</th>
                                        <th className="border-b border-black/[0.04] px-6 py-5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Ngày thêm</th>
                                        <th className="border-b border-black/[0.04] px-6 py-5 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Định dạng</th>
                                        <th className="border-b border-black/[0.04] px-6 py-5 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Trạng thái</th>
                                        <th className="border-b border-black/[0.04] px-6 py-5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                                    {videos.map((video, idx) => (
                                        <tr key={video.id} className="group transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                                            <td className="px-6 py-5 text-xs text-stone-400">{currentPage * PAGE_SIZE + idx + 1}</td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/[0.04] bg-stone-50 dark:border-white/[0.04] dark:bg-stone-800/50">
                                                        {video.thumbnailUrl ? (
                                                            <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                                                        ) : video.videoUrl ? (
                                                            <video src={video.videoUrl} className="h-full w-full object-cover" muted preload="metadata" />
                                                        ) : (
                                                            <svg className="h-5 w-5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span className="line-clamp-2 max-w-[260px] font-medium text-stone-900 dark:text-stone-100">{video.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-medium text-stone-900 dark:text-white">{video.productCount}</span>
                                                    <span className="text-[10px] text-stone-400">sản phẩm</span>
                                                </div>
                                                {video.productNames.length > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {video.productNames.slice(0, 3).map((name, i) => (
                                                            <span key={i} className="line-clamp-1 max-w-[160px] text-[10px] text-stone-500">{name}</span>
                                                        ))}
                                                        {video.productNames.length > 3 && (
                                                            <span className="text-[10px] text-stone-400">+{video.productNames.length - 3}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-center text-xs font-medium text-stone-700 dark:text-stone-300">
                                                {formatDuration(video.duration)}
                                            </td>
                                            <td className="px-6 py-5 text-xs text-stone-400">
                                                {formatDate(video.createdAt)}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="inline-flex items-center rounded-full border border-stone-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:border-stone-700 dark:text-stone-400">
                                                    {getExt(video.videoUrl)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                                                    video.status === 'active' ? 'text-emerald-600' : 'text-red-500'
                                                }`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${video.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                    {video.status === 'active' ? 'Hoạt động' : 'Lỗi video'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <button onClick={() => openEdit(video)}
                                                        title="Sửa video"
                                                        className="text-stone-300 hover:text-[#B7848C] dark:text-stone-600 dark:hover:text-[#B7848C] transition-colors">
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                                        </svg>
                                                    </button>
                                                    {deleteConfirm === video.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => handleDelete(video.id)}
                                                                className="text-[10px] font-semibold text-red-500 hover:text-red-700 transition-colors">Xóa</button>
                                                            <button onClick={() => setDeleteConfirm(null)}
                                                                className="text-[10px] text-stone-400 hover:text-stone-600 transition-colors">Hủy</button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => setDeleteConfirm(video.id)}
                                                            title="Xóa video"
                                                            className="text-stone-300 hover:text-red-500 dark:text-stone-600 dark:hover:text-red-400 transition-colors">
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div ref={sentinelRef} className="flex items-center justify-center py-4">
                            {loadingMore && (
                                <div className="h-5 w-5 animate-spin rounded-full border-[1.5px] border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-white" />
                            )}
                            {!hasMore && videos.length > 0 && (
                                <p className="text-xs text-stone-400">Đã hiển thị tất cả {videos.length} video</p>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Add/Edit Modal */}
            {modal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && closeModal()}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative z-10 w-full max-w-lg rounded-2xl border border-black/[0.06] bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#141413] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.04] px-6 py-4">
                            <h2 className="text-base font-semibold text-stone-900 dark:text-white" style={{ fontFamily: FONT_STACK.serif }}>
                                {modal.mode === 'add' ? 'Thêm video mới' : 'Chỉnh sửa video'}
                            </h2>
                            <button onClick={closeModal} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="max-h-[calc(100vh-160px)] overflow-y-auto p-6 space-y-5">
                            {/* Title */}
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">
                                    Tiêu đề video <span className="text-red-400">*</span>
                                </label>
                                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="Nhập tiêu đề video..."
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none transition-all focus:border-[#B7848C] focus:bg-white dark:border-stone-700 dark:bg-stone-800/50 dark:text-white dark:placeholder-stone-600 dark:focus:border-[#B7848C]" />
                                {errors.title && <p className="mt-1 text-[11px] text-red-500">{errors.title}</p>}
                            </div>

                            {/* Product selection */}
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">
                                    Chọn sản phẩm <span className="text-red-400">*</span>
                                </label>
                                <div ref={productSearchRef} className="relative">
                                    <input
                                        value={productSearch}
                                        onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value); }}
                                        onFocus={() => { if (productSearch) searchProducts(productSearch); }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && productResults.length === 1) {
                                                e.preventDefault();
                                                addProduct(productResults[0]);
                                            }
                                        }}
                                        placeholder="Tìm và chọn sản phẩm..."
                                        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 pr-10 text-sm text-stone-900 placeholder-stone-400 outline-none transition-all focus:border-[#B7848C] focus:bg-white dark:border-stone-700 dark:bg-stone-800/50 dark:text-white dark:placeholder-stone-600 dark:focus:border-[#B7848C]"
                                    />
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                    </svg>

                                    {/* Dropdown rendered inside a fixed-height scrollable container */}
                                    {productDropdownOpen && productResults.length > 0 && (
                                        <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-[#1E1C1A] overflow-y-auto"
                                            style={{ maxHeight: '240px' }}>
                                            {productResults.map(p => (
                                                <button key={p.id} onClick={() => addProduct(p)}
                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors">
                                                    {p.imageUrl && (
                                                        <img src={p.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="line-clamp-1 text-stone-900 dark:text-stone-100">{p.name}</p>
                                                        {p.brandName && (
                                                            <p className="text-[10px] text-stone-400">{p.brandName}</p>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {errors.products && <p className="mt-1 text-[11px] text-red-500">{errors.products}</p>}

                                {/* Selected products */}
                                {form.productIds.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {form.productIds.map(id => {
                                            const name = getSelectedProductNames([id])[0];
                                            return (
                                                <div key={id} className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 dark:border-stone-700 dark:bg-stone-800/50">
                                                    <span className="line-clamp-1 max-w-[180px] text-xs text-stone-700 dark:text-stone-300">{name}</span>
                                                    <button onClick={() => removeProduct(id)}
                                                        className="text-stone-400 hover:text-red-500 transition-colors">
                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <p className="mt-1.5 text-[10px] text-stone-400">{form.productIds.length} sản phẩm đã chọn</p>
                            </div>

                            {/* Video upload via Cloudinary */}
                            {modal.mode === 'add' && (
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">
                                        Upload video <span className="text-red-400">*</span>
                                    </label>
                                    {form.uploaded ? (
                                        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                                            <video src={form.uploaded.videoUrl} className="h-16 w-20 rounded-lg object-cover shrink-0" controls muted preload="metadata" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 truncate">
                                                    {form.uploaded.videoUrl.split('/').pop()?.split('?')[0]}
                                                </p>
                                                <p className="mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-500">
                                                    {form.uploaded.duration}s · Video đã tải lên
                                                </p>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button onClick={openCloudinaryWidget}
                                                    className="text-[11px] text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors">
                                                    Thay đổi
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={openCloudinaryWidget}
                                            className="relative flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/50 p-8 transition-colors hover:border-[#B7848C] hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800/30 dark:hover:border-[#B7848C]">
                                            <svg className="mb-3 h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                            </svg>
                                            <p className="text-sm font-medium text-stone-600 dark:text-stone-400">Tải lên video</p>
                                            <p className="mt-1 text-xs text-stone-400">Bấm để chọn file từ máy hoặc camera</p>
                                            <p className="mt-2 text-[10px] text-stone-400">MP4, WebM · Tối đa 10s · Tối đa 20MB</p>
                                        </button>
                                    )}
                                    {errors.upload && <p className="mt-1 text-[11px] text-red-500">{errors.upload}</p>}
                                </div>
                            )}

                            {/* Video preview in edit mode */}
                            {modal.mode === 'edit' && modal.video && (
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">Video hiện tại</label>
                                    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
                                        {modal.video.thumbnailUrl ? (
                                            <img src={modal.video.thumbnailUrl} alt="" className="h-16 w-20 rounded-lg object-cover shrink-0" />
                                        ) : (
                                            <video src={modal.video.videoUrl} className="h-16 w-20 rounded-lg object-cover shrink-0" controls muted preload="metadata" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-stone-700 dark:text-stone-300 truncate">
                                                {modal.video.videoUrl.split('/').pop()?.split('?')[0]}
                                            </p>
                                            <p className="mt-0.5 text-[10px] text-stone-400">{modal.video.duration}s</p>
                                        </div>
                                        <a href={modal.video.videoUrl} target="_blank" rel="noopener noreferrer"
                                            className="shrink-0 text-[11px] text-[#B7848C] hover:underline">Mở video</a>
                                    </div>
                                </div>
                            )}

                            {/* Submit error */}
                            {errors.submit && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                                    {errors.submit}
                                </div>
                            )}
                        </div>

                        {/* Sticky footer */}
                        <div className="flex items-center justify-end gap-3 border-t border-black/[0.04] dark:border-white/[0.04] px-6 py-4 bg-white dark:bg-[#141413]">
                            <button onClick={closeModal}
                                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800">
                                Hủy
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex items-center gap-2 rounded-xl bg-[#B7848C] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#a3737a] disabled:opacity-60">
                                {saving ? (
                                    <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />Đang lưu...</>
                                ) : (
                                    modal.mode === 'add' ? 'Lưu video' : 'Cập nhật'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
