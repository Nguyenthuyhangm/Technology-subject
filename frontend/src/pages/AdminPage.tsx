import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowUpRight } from 'lucide-react';
import { FONT_STACK, ADMIN_EMAILS } from '../components/admin/adminConstants';
import OverviewTab from '../components/admin/OverviewTab';
import UsersTab from '../components/admin/UsersTab';
import ProductsTab from '../components/admin/ProductsTab';
import CrawlerTab from '../components/admin/CrawlerTab';
import AffiliateTab from '../components/admin/AffiliateTab';
import PaymentsTab from '../components/admin/PaymentsTab';
import VideosTab from '../components/admin/VideosTab';
import apiClient from '../api/apiClient';

export default function AdminPage() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<
        'overview' | 'users' | 'products' | 'crawler' | 'affiliate' | 'payments' | 'videos'
    >('overview');
    const [pendingCount, setPendingCount] = useState(0);

    const fetchPendingCount = useCallback(async () => {
        try {
            const res = await apiClient.get('/payments/admin/pending-count');
            setPendingCount(res.data.count ?? 0);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchPendingCount();
        const interval = setInterval(fetchPendingCount, 10_000);
        return () => clearInterval(interval);
    }, [fetchPendingCount]);

    useEffect(() => {
        if (authLoading) return;
        if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
            navigate('/');
        }
    }, [user, authLoading, navigate]);

    if (authLoading) return (
        <div className="flex min-h-screen items-center justify-center bg-[#FDFBF9] dark:bg-[#0F0D0C]">
            <div className="h-6 w-6 animate-spin rounded-full border-[1.5px] border-[#B7848C] border-t-transparent" />
        </div>
    );

    if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) return null;

    const tabs = [
        { key: 'overview', label: 'Tổng quan', badge: 0 },
        { key: 'users', label: 'Người dùng', badge: 0 },
        { key: 'products', label: 'Sản phẩm', badge: 0 },
        { key: 'videos', label: 'Video', badge: 0 },
        { key: 'crawler', label: 'Crawler', badge: 0 },
        { key: 'affiliate', label: 'Affiliate', badge: 0 },
        { key: 'payments', label: 'Thanh toán', badge: pendingCount },
        { key: 'chat', label: 'Chat hỗ trợ', badge: 0 },
    ] as const;

    return (
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] text-stone-900 dark:text-stone-100 selection:bg-stone-200 dark:selection:bg-stone-800"
            style={{ fontFamily: FONT_STACK.sans }}>

            <header className="sticky top-0 z-50 bg-[#FAFAFA]/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/')}
                            className="text-xl tracking-tight text-stone-900 dark:text-white"
                            style={{ fontFamily: FONT_STACK.serif }}>
                            Price<span className="italic text-[#B7848C]">Hawk</span>
                        </button>
                        <div className="h-3 w-[1px] bg-stone-300 dark:bg-stone-800" />
                        <span className="text-[10px] font-medium tracking-[0.15em] text-stone-400 uppercase">
                            Admin Workspace
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Chuông thông báo payment pending */}
                        {pendingCount > 0 && (
                            <button
                                onClick={() => setActiveTab('payments')}
                                className="relative flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 dark:border-stone-700 bg-white/80 dark:bg-white/10 transition hover:bg-stone-50 dark:hover:bg-white/15"
                                title={`${pendingCount} yêu cầu thanh toán chờ duyệt`}
                            >
                                <svg className="h-4 w-4 text-stone-600 dark:text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                                </svg>
                                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#B7848C] text-[9px] font-bold text-white">
                                    {pendingCount > 9 ? '9+' : pendingCount}
                                </span>
                            </button>
                        )}
                        <button onClick={() => navigate('/')}
                            className="group flex items-center gap-2 text-xs font-medium text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors">
                            Trang chủ
                            <ArrowUpRight size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                </div>

                <div className="mx-auto max-w-[1200px] px-6">
                    <div className="flex gap-1">
                        {tabs.map(tab => (
                            <button key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`relative px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                                        ? 'border-[#B7848C] text-stone-900 dark:text-stone-100'
                                        : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                                    }`}>
                                {tab.label}
                                {tab.badge > 0 && (
                                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B7848C] px-1 text-[9px] font-bold text-white">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1200px] px-6 py-12">
                <div className={activeTab === 'overview' ? '' : 'hidden'}><OverviewTab /></div>
                <div className={activeTab === 'users' ? '' : 'hidden'}><UsersTab /></div>
                <div className={activeTab === 'products' ? '' : 'hidden'}><ProductsTab /></div>
                <div className={activeTab === 'videos' ? '' : 'hidden'}><VideosTab /></div>
                <div className={activeTab === 'crawler' ? '' : 'hidden'}><CrawlerTab /></div>
                <div className={activeTab === 'affiliate' ? '' : 'hidden'}><AffiliateTab /></div>
                <div className={activeTab === 'payments' ? '' : 'hidden'}><PaymentsTab /></div>
                <div className={activeTab === 'chat' ? '' : 'hidden'}><AdminChatPanel /></div>
            </main>
        </div>
    );
}