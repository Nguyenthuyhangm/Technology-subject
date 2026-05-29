import { useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';
import { Search, Trash2, User as UserIcon, Bell, Heart } from 'lucide-react';
import { FONT_STACK } from './adminConstants';
import type { UserItem } from '../../types/admin';

export default function UsersTab() {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [planFilter, setPlanFilter] = useState('all');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const fetchUsers = (q?: string, plan?: string) => {
        setUsersLoading(true);
        const params: Record<string, string> = {};
        if (q) params.search = q;
        if (plan && plan !== 'all') params.plan = plan;
        apiClient.get('/admin/users', { params })
            .then(res => setUsers(res.data))
            .catch(console.error)
            .finally(() => setUsersLoading(false));
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchUsers(search, planFilter);
    };

    const handlePlanFilterChange = (plan: string) => {
        setPlanFilter(plan);
        fetchUsers(search, plan);
    };

    const handlePlanChange = async (id: string, plan: string) => {
        await apiClient.patch(`/admin/users/${id}`, { plan });
        setUsers(prev => prev.map(u => u.id === id ? { ...u, plan } : u));
    };

    const handleDelete = async (id: string) => {
        await apiClient.delete(`/admin/users/${id}`);
        setUsers(prev => prev.filter(u => u.id !== id));
        setDeleteConfirm(null);
    };

    const freeCount = users.filter(u => u.plan === 'free').length;
    const premiumCount = users.filter(u => u.plan === 'premium').length;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="mb-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-stone-900 dark:text-white"
                        style={{ fontFamily: FONT_STACK.serif }}>
                        Quản lý Thành viên
                    </h1>
                    <div className="mt-3 flex items-center gap-3 text-sm">
                        <span className="font-medium text-stone-900 dark:text-white">
                            {users.length} <span className="font-normal text-stone-500">tài khoản</span>
                        </span>
                        <span className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700" />
                        <span className="text-stone-500">{freeCount} Free</span>
                        <span className="h-1 w-1 rounded-full bg-stone-300 dark:bg-stone-700" />
                        <span className="font-medium text-[#B7848C]">{premiumCount} Premium</span>
                    </div>
                </div>

                <div className="flex w-full flex-col gap-6 md:flex-row md:items-center lg:w-auto">
                    {/* Segmented Control (Filters) cao cấp */}
                    <div className="flex items-center rounded-full bg-stone-100/80 p-1.5 dark:bg-[#1A1817] border border-black/[0.03] dark:border-white/[0.03]">
                        {[
                            { id: 'all', label: 'Tất cả' },
                            { id: 'free', label: 'FREE' },
                            { id: 'premium', label: 'PREMIUM' }
                        ].map(p => (
                            <button key={p.id}
                                onClick={() => handlePlanFilterChange(p.id)}
                                className={`relative rounded-full px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-all duration-300 ${
                                    planFilter === p.id
                                        ? 'bg-white text-stone-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:bg-stone-800 dark:text-white'
                                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                                }`}>
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Search Bar tối giản */}
                    <form onSubmit={handleSearch} className="flex items-center gap-4">
                        <div className="relative group w-full md:w-56">
                            <Search size={15} strokeWidth={1.5} className="absolute left-0 top-1/2 -translate-y-1/2 text-stone-400 transition-colors group-focus-within:text-[#B7848C]" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Tìm kiếm thành viên..."
                                className="w-full appearance-none border-0 border-b border-stone-200 bg-transparent py-2.5 pl-7 pr-0 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-[#B7848C] focus:outline-none focus:ring-0 dark:border-stone-800 dark:text-white dark:placeholder-stone-600"
                            />
                        </div>
                    </form>
                </div>
            </div>

            {/* Table Section */}
            <div className="rounded-2xl border border-black/[0.04] bg-white overflow-hidden dark:border-white/[0.04] dark:bg-[#121212]">
                {usersLoading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="h-5 w-5 animate-spin rounded-full border-[1.5px] border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-white" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-stone-50 dark:bg-stone-800/50">
                            <UserIcon className="text-stone-300 dark:text-stone-600" size={24} strokeWidth={1} />
                        </div>
                        <p className="text-sm font-medium text-stone-900 dark:text-white">Danh sách trống</p>
                        <p className="mt-1.5 text-xs text-stone-500">Không tìm thấy thành viên phù hợp với bộ lọc.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr>
                                    {/* Căn chỉnh header chuẩn xác theo từng loại dữ liệu */}
                                    <th className="border-b border-black/[0.04] px-8 py-5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Thành viên</th>
                                    <th className="border-b border-black/[0.04] px-6 py-5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Email</th>
                                    <th className="border-b border-black/[0.04] px-6 py-5 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Gói tài khoản</th>
                                    <th className="border-b border-black/[0.04] px-4 py-5 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Alerts</th>
                                    <th className="border-b border-black/[0.04] px-4 py-5 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Wishlist</th>
                                    <th className="border-b border-black/[0.04] px-6 py-5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Ngày tham gia</th>
                                    <th className="border-b border-black/[0.04] px-8 py-5 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:border-white/[0.04]">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/[0.02] dark:divide-white/[0.02]">
                                {users.map(u => (
                                    <tr key={u.id} className="group transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[11px] font-semibold text-stone-600 dark:bg-stone-800/80 dark:text-stone-300">
                                                    {u.name?.[0]?.toUpperCase() ?? '?'}
                                                </div>
                                                <span className="font-medium text-stone-900 dark:text-stone-100">{u.name || 'Chưa cập nhật'}</span>
                                            </div>
                                        </td>
                                        
                                        <td className="px-6 py-5">
                                            <span className="text-stone-500 dark:text-stone-400">{u.email}</span>
                                        </td>
                                        
                                        <td className="px-6 py-5 text-center">
                                            <div className="relative inline-block">
                                                <select
                                                    value={u.plan}
                                                    onChange={e => handlePlanChange(u.id, e.target.value)}
                                                    className={`appearance-none cursor-pointer rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider outline-none transition-colors border ${
                                                        u.plan === 'premium'
                                                            ? 'bg-[#B7848C]/10 text-[#B7848C] border-[#B7848C]/20 hover:bg-[#B7848C]/20'
                                                            : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100 dark:bg-stone-800/50 dark:border-stone-700 dark:text-stone-400'
                                                    }`}
                                                >
                                                    <option value="free">Free</option>
                                                    <option value="premium">Premium</option>
                                                </select>
                                            </div>
                                        </td>
                                        
                                        <td className="px-4 py-5">
                                            <div className="flex items-center justify-center gap-1.5 text-stone-500 dark:text-stone-400">
                                                <Bell size={13} strokeWidth={1.5} className="text-stone-400" />
                                                <span className="text-xs font-medium">{u.alertCount ?? 0}</span>
                                            </div>
                                        </td>
                                        
                                        <td className="px-4 py-5">
                                            <div className="flex items-center justify-center gap-1.5 text-stone-500 dark:text-stone-400">
                                                <Heart size={13} strokeWidth={1.5} className="text-stone-400" />
                                                <span className="text-xs font-medium">{u.wishlistCount ?? 0}</span>
                                            </div>
                                        </td>
                                        
                                        <td className="px-6 py-5">
                                            <span className="text-xs text-stone-400 dark:text-stone-500">
                                                {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}
                                            </span>
                                        </td>
                                        
                                        <td className="px-8 py-5 text-right">
                                            {deleteConfirm === u.id ? (
                                                <div className="flex items-center justify-end gap-3">
                                                    <button onClick={() => handleDelete(u.id)}
                                                        className="text-[10px] font-semibold uppercase tracking-wider text-red-500 hover:text-red-700 transition-colors">
                                                        Xóa
                                                    </button>
                                                    <div className="h-3 w-px bg-stone-300 dark:bg-stone-700" />
                                                    <button onClick={() => setDeleteConfirm(null)}
                                                        className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 hover:text-stone-600 transition-colors">
                                                        Hủy
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setDeleteConfirm(u.id)}
                                                    className="text-stone-300 hover:text-red-500 dark:text-stone-600 dark:hover:text-red-400 transition-colors">
                                                    <Trash2 size={16} strokeWidth={1.5} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}