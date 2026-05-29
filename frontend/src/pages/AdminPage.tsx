import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowUpRight } from 'lucide-react';
import { FONT_STACK, ADMIN_EMAILS } from '../components/admin/adminConstants';
import OverviewTab from '../components/admin/OverviewTab';
import UsersTab from '../components/admin/UsersTab';
import ProductsTab from '../components/admin/ProductsTab';
import CrawlerTab from '../components/admin/CrawlerTab';
import AffiliateTab from '../components/admin/AffiliateTab';

export default function AdminPage() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<
        'overview' | 'users' | 'products' | 'crawler' | 'affiliate'
    >('overview');

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
        { key: 'overview', label: 'Tổng quan' },
        { key: 'users', label: 'Người dùng' },
        { key: 'products', label: 'Sản phẩm' },
        { key: 'crawler', label: 'Crawler' },
        { key: 'affiliate', label: 'Affiliate' },

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
                    <button onClick={() => navigate('/')}
                        className="group flex items-center gap-2 text-xs font-medium text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors">
                        Trang chủ
                        <ArrowUpRight size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>

                <div className="mx-auto max-w-[1200px] px-6">
                    <div className="flex gap-1">
                        {tabs.map(tab => (
                            <button key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                                        ? 'border-[#B7848C] text-stone-900 dark:text-stone-100'
                                        : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                                    }`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1200px] px-6 py-12">
                <div className={activeTab === 'overview' ? '' : 'hidden'}><OverviewTab /></div>
                <div className={activeTab === 'users' ? '' : 'hidden'}><UsersTab /></div>
                <div className={activeTab === 'products' ? '' : 'hidden'}><ProductsTab /></div>
                <div className={activeTab === 'crawler' ? '' : 'hidden'}><CrawlerTab /></div>
                <div className={activeTab === 'affiliate' ? '' : 'hidden'}><AffiliateTab /></div>



            </main>
        </div>
    );
}