import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL } from "../lib/supabase";
import AppHeader from "../components/layout/AppHeader";

const FONT_STACK = {
    serif: '"Times New Roman", Georgia, serif',
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

const BANK_INFO = {
    bankName: "MB Bank",
    accountNo: "12345678999",
    accountName: "PRICEHAWK COMPANY",
};

function formatVND(value: number) {
    return new Intl.NumberFormat("vi-VN").format(value);
}

function StatusModal({ type, onClose }: { type: 'submitted' | 'paid' | 'rejected'; onClose: () => void }) {
    const isPaid = type === 'paid';
    const isSubmitted = type === 'submitted';

    useEffect(() => {
        const t = setTimeout(onClose, isSubmitted ? 3000 : 4000);
        return () => clearTimeout(t);
    }, [onClose, isSubmitted]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-[28px] bg-white dark:bg-[#1A1614] p-8 shadow-xl text-center">
                <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                    isPaid ? 'bg-emerald-100 dark:bg-emerald-950/40' :
                    isSubmitted ? 'bg-blue-100 dark:bg-blue-950/40' :
                    'bg-red-100 dark:bg-red-950/40'
                }`}>
                    {isPaid ? (
                        <svg className="h-7 w-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    ) : isSubmitted ? (
                        <svg className="h-7 w-7 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                            <circle cx="12" cy="12" r="10" strokeWidth={2} />
                        </svg>
                    ) : (
                        <svg className="h-7 w-7 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                </div>
                <h3 className="mb-2 text-base font-semibold text-stone-900 dark:text-stone-100">
                    {isPaid ? '🎉 Thanh toán được xác nhận!' : isSubmitted ? 'Đã gửi yêu cầu!' : 'Thanh toán bị từ chối'}
                </h3>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                    {isPaid ? 'Tài khoản của bạn đã được nâng cấp lên Premium.' :
                     isSubmitted ? 'Vui lòng chờ admin xác nhận (thường trong 24h).' :
                     'Thanh toán không được xác nhận. Vui lòng liên hệ admin.'}
                </p>
                <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">Tự động chuyển về hồ sơ...</p>
            </div>
        </div>
    );
}

export default function PaymentPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { session } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const state = location.state as {
        orderId: string;
        transferCode: string;
        amount: number;
        plan: string;
    } | null;

    const [billImage, setBillImage] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [modalType, setModalType] = useState<'submitted' | 'paid' | 'rejected' | null>(null);
    const [error, setError] = useState("");
    const [polling, setPolling] = useState(false);

    // Poll status mỗi 10s sau khi submit
    const pollStatus = useCallback(async () => {
        if (!session?.access_token || !state) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/payments/${state.orderId}/status`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) return;
            const status: string = await res.json();
            if (status === 'PAID') {
                setPolling(false);
                setModalType('paid');
            } else if (status === 'REJECTED') {
                setPolling(false);
                setModalType('rejected');
            }
        } catch { /* silent */ }
    }, [session?.access_token, state]);

    useEffect(() => {
        if (!polling) return;
        const interval = setInterval(pollStatus, 10_000);
        return () => clearInterval(interval);
    }, [polling, pollStatus]);

    if (!state) {
        navigate("/profile");
        return null;
    }

    const { orderId, transferCode, amount } = state;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        `${BANK_INFO.bankName}|${BANK_INFO.accountNo}|${amount}|${transferCode}`
    )}`;

    const copyText = async (text: string) => {
        await navigator.clipboard.writeText(text);
    };

    const handleUploadBill = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setBillImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!session?.access_token) return;
        setSubmitting(true);
        setError("");
        try {
            const res = await fetch(`${BACKEND_URL}/api/payments/${orderId}/mark-submitted`, {
                method: "POST",
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) throw new Error(`Lỗi ${res.status}`);
            setModalType('submitted');
            setPolling(true);
        } catch (e: any) {
            setError(e.message ?? "Gửi xác nhận thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FCF8F4] dark:bg-[#0F0D0C] text-stone-900 dark:text-stone-100"
            style={{ fontFamily: FONT_STACK.sans }}>

            {/* Background blobs */}
            <div className="pointer-events-none fixed left-[-10%] top-[-14%] h-[42vw] w-[42vw] rounded-full bg-[#F7ECEE] dark:bg-[#2A1F1A] opacity-40 blur-[160px]" />
            <div className="pointer-events-none fixed bottom-[-12%] right-[-6%] h-[34vw] w-[34vw] rounded-full bg-[#F4EEE7] dark:bg-[#1A1F2A] opacity-40 blur-[160px]" />

            <AppHeader currentPage="home" />

            <main className="relative mx-auto max-w-2xl px-6 pb-24 pt-32 lg:px-8">

                {/* Title */}
                <div className="mb-10">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8E6A72]">
                        Premium Payment
                    </p>
                    <h1 className="mt-2 text-4xl tracking-[-0.02em] text-stone-900 dark:text-stone-100"
                        style={{ fontFamily: FONT_STACK.serif }}>
                        Thanh toán chuyển khoản
                    </h1>
                    <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
                        Quét QR hoặc chuyển khoản thủ công để nâng cấp Premium.
                    </p>
                </div>

                {/* Main card */}
                <section className="rounded-[28px] border border-stone-200/80 dark:border-stone-700/40 bg-white/80 dark:bg-[#1A1614]/80 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur-sm">

                    {/* QR — nhỏ hơn, căn giữa */}
                    <div className="mb-8 flex justify-center">
                        <div className="rounded-[20px] border border-stone-200 dark:border-stone-700 bg-white p-3 shadow-sm">
                            <img src={qrUrl} alt="QR Payment" className="h-[220px] w-[220px] rounded-xl object-cover" />
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="space-y-3">
                        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-800/40 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Ngân hàng</p>
                            <p className="mt-0.5 text-sm font-semibold">{BANK_INFO.bankName}</p>
                        </div>

                        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-800/40 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Số tài khoản</p>
                                    <p className="mt-0.5 text-sm font-semibold">{BANK_INFO.accountNo}</p>
                                </div>
                                <button onClick={() => copyText(BANK_INFO.accountNo)}
                                    className="rounded-full border border-stone-300 dark:border-stone-600 px-3 py-1.5 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-700 transition">
                                    Copy
                                </button>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-800/40 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Chủ tài khoản</p>
                            <p className="mt-0.5 text-sm font-semibold">{BANK_INFO.accountName}</p>
                        </div>

                        <div className="rounded-2xl border border-[#E2C9CC] dark:border-[#4A2D31] bg-[#FBF3F4] dark:bg-[#2A1A1D]/50 px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Số tiền</p>
                            <p className="mt-0.5 text-lg font-bold text-[#B7848C]">{formatVND(amount)}đ</p>
                        </div>

                        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-800/40 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Nội dung chuyển khoản</p>
                                    <p className="mt-0.5 text-sm font-semibold text-[#B7848C]">{transferCode}</p>
                                </div>
                                <button onClick={() => copyText(transferCode)}
                                    className="rounded-full border border-stone-300 dark:border-stone-600 px-3 py-1.5 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-700 transition">
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Upload Bill — nhỏ gọn */}
                    <div className="mt-6">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                            Ảnh bill (tuỳ chọn)
                        </p>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadBill} />

                        {billImage ? (
                            <div className="flex items-center gap-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/40 p-3">
                                <img src={billImage} alt="Bill" className="h-16 w-16 rounded-xl object-cover shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-stone-600 dark:text-stone-300 truncate">Đã chọn ảnh bill</p>
                                    <button onClick={() => fileInputRef.current?.click()}
                                        className="mt-1 text-xs text-[#B7848C] hover:underline">
                                        Đổi ảnh
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => fileInputRef.current?.click()}
                                className="w-full rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 py-3 text-sm font-medium text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition">
                                + Upload ảnh bill
                            </button>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-6 flex gap-3">
                        <button onClick={() => navigate(-1)}
                            className="flex-1 rounded-full border border-stone-300 dark:border-stone-700 py-3 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition">
                            Quay lại
                        </button>
                        <button onClick={handleSubmit} disabled={submitting}
                            className="flex-1 rounded-full bg-[#B7848C] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition">
                            {submitting ? "Đang gửi..." : "Tôi đã thanh toán"}
                        </button>
                    </div>
                </section>
            </main>

            {modalType && (
                <StatusModal type={modalType} onClose={() => navigate("/profile")} />
            )}
        </div>
    );
}
