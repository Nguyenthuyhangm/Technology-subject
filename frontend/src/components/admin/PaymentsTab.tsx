import { useCallback, useEffect, useState } from 'react';
import apiClient from '../../api/apiClient';

type PaymentOrder = {
    id: string;
    userId: string;
    userEmail: string;
    plan: string;
    method: string;
    amount: number;
    transferCode: string;
    status: string;
    proofImage: string | null;
    createdAt: string;
    submittedAt: string | null;
    confirmedAt: string | null;
};

const PLAN_LABEL: Record<string, string> = {
    MONTHLY: '1 Tháng',
    QUARTERLY: '3 Tháng',
    YEARLY: '1 Năm',
};

function formatVND(v: number) {
    return new Intl.NumberFormat('vi-VN').format(v) + 'đ';
}

function formatDate(iso?: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PaymentsTab() {
    const [orders, setOrders] = useState<PaymentOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await apiClient.get('/payments/admin/pending');
            setOrders(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 10_000);
        return () => clearInterval(interval);
    }, [fetchOrders]);

    const handleAction = async (id: string, action: 'confirm' | 'reject') => {
        setActionId(id);
        try {
            await apiClient.post(`/payments/admin/${id}/${action}`);
            setOrders(prev => prev.filter(o => o.id !== id));
        } catch (e) {
            console.error(e);
        } finally {
            setActionId(null);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#B7848C] border-t-transparent" />
        </div>
    );

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Yêu cầu nâng cấp Premium</h2>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                    {orders.length === 0 ? 'Không có yêu cầu nào đang chờ.' : `${orders.length} yêu cầu đang chờ xác nhận`}
                </p>
            </div>

            {orders.length === 0 ? (
                <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/40 p-10 text-center">
                    <p className="text-sm text-stone-400">Tất cả đã được xử lý ✓</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => (
                        <div key={order.id}
                            className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/40 p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="space-y-1.5 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                                            {order.userEmail}
                                        </span>
                                        <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase">
                                            {PLAN_LABEL[order.plan] ?? order.plan}
                                        </span>
                                        <span className="rounded-full bg-[#FBF3F4] dark:bg-[#2A1A1D]/50 px-2 py-0.5 text-[10px] font-bold text-[#B7848C]">
                                            {formatVND(order.amount)}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                                        <span>Mã CK: <span className="font-mono font-semibold text-[#B7848C]">{order.transferCode}</span></span>
                                        <span>Gửi lúc: {formatDate(order.submittedAt)}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {order.proofImage && (
                                        <a href={order.proofImage} target="_blank" rel="noopener noreferrer"
                                            className="rounded-full border border-stone-300 dark:border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition">
                                            Xem bill
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleAction(order.id, 'confirm')}
                                        disabled={actionId === order.id}
                                        className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
                                    >
                                        {actionId === order.id ? '...' : 'Xác nhận'}
                                    </button>
                                    <button
                                        onClick={() => handleAction(order.id, 'reject')}
                                        disabled={actionId === order.id}
                                        className="rounded-full border border-red-300 dark:border-red-800 px-4 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition"
                                    >
                                        Từ chối
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
