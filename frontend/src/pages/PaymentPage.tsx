import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/layout/AppHeader";

const FONT_STACK = {
    serif: '"Times New Roman", Georgia, serif',
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

function formatVND(value: number) {
    return new Intl.NumberFormat("vi-VN").format(value);
}

export default function PaymentPage() {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [billImage, setBillImage] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    // Fake data (BE nối sau)
    const paymentInfo = {
        bankName: "MB Bank",
        accountNo: "12345678999",
        accountName: "PRICEHAWK COMPANY",
        amount: 99000,
        transferCode: "PHK_92831",
        qrImage:
            "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=PRICEHAWK_PAYMENT",
    };

    const copyText = async (text: string) => {
        await navigator.clipboard.writeText(text);
    };

    const handleUploadBill = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setBillImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = () => {
        setSubmitted(true);

        // Sau này BE:
        // POST /api/payment/{id}/mark-submitted
    };

    return (
        <div
            className="min-h-screen bg-[#FCF8F4] dark:bg-[#0F0D0C] text-stone-900 dark:text-stone-100"
            style={{ fontFamily: FONT_STACK.sans }}
        >
            {/* Blur background */}
            <div className="pointer-events-none fixed left-[-10%] top-[-14%] h-[42vw] w-[42vw] rounded-full bg-[#F7ECEE] dark:bg-[#2A1F1A] opacity-40 blur-[160px]" />
            <div className="pointer-events-none fixed bottom-[-12%] right-[-6%] h-[34vw] w-[34vw] rounded-full bg-[#F4EEE7] dark:bg-[#1A1F2A] opacity-40 blur-[160px]" />

            <AppHeader currentPage="home" />

            <main className="relative mx-auto max-w-2xl px-6 pb-24 pt-32 lg:px-8">
                {/* Title */}
                <div className="mb-10">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8E6A72]">
                        Premium Payment
                    </p>
                    <h1
                        className="mt-2 text-4xl tracking-[-0.02em] text-stone-900 dark:text-stone-100"
                        style={{
                            fontFamily:
                            FONT_STACK.serif,
                        }}
                    >
                        Thanh toán chuyển khoản
                    </h1>
                    <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
                        Quét QR hoặc chuyển
                        khoản thủ công để
                        nâng cấp Premium.
                    </p>
                </div>

                {/* Main card */}
                <section className="rounded-[28px] border border-stone-200/80 dark:border-stone-700/40 bg-white/80 dark:bg-[#1A1614]/80 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur-sm">

                    {/* QR */}
                    <div className="mb-8 flex justify-center">
                        <div className="rounded-[24px] border border-stone-200 dark:border-stone-700 bg-white p-4 shadow-sm">
                            <img
                                src={
                                    paymentInfo.qrImage
                                }
                                alt="QR Payment"
                                className="h-64 w-64 rounded-2xl object-cover"
                            />
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="space-y-4">
                        {/* Bank */}
                        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-800/40 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                                Ngân hàng
                            </p>
                            <p className="mt-1 text-base font-semibold">
                                {
                                    paymentInfo.bankName
                                }
                            </p>
                        </div>

                        {/* Account */}
                        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-800/40 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                                        Số tài khoản
                                    </p>
                                    <p className="mt-1 text-base font-semibold">
                                        {
                                            paymentInfo.accountNo
                                        }
                                    </p>
                                </div>

                                <button
                                    onClick={() =>
                                        copyText(
                                            paymentInfo.accountNo
                                        )
                                    }
                                    className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>

                        {/* Account Name */}
                        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-800/40 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                                Chủ tài khoản
                            </p>
                            <p className="mt-1 text-base font-semibold">
                                {
                                    paymentInfo.accountName
                                }
                            </p>
                        </div>

                        {/* Amount */}
                        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FBF3F4] dark:bg-[#2A1A1D]/50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                                Số tiền
                            </p>
                            <p className="mt-1 text-xl font-bold text-[#B7848C]">
                                {formatVND(
                                    paymentInfo.amount
                                )}
                                đ
                            </p>
                        </div>

                        {/* Transfer Content */}
                        <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-800/40 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                                        Nội dung
                                        chuyển khoản
                                    </p>
                                    <p className="mt-1 text-base font-semibold text-[#B7848C]">
                                        {
                                            paymentInfo.transferCode
                                        }
                                    </p>
                                </div>

                                <button
                                    onClick={() =>
                                        copyText(
                                            paymentInfo.transferCode
                                        )
                                    }
                                    className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Upload Bill */}
                    <div className="mt-8">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                            Ảnh bill
                            (optional)
                        </p>

                        <input
                            ref={
                                fileInputRef
                            }
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={
                                handleUploadBill
                            }
                        />

                        <button
                            onClick={() =>
                                fileInputRef.current?.click()
                            }
                            className="w-full rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 py-4 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800"
                        >
                            Upload ảnh bill
                        </button>

                        {billImage && (
                            <div className="mt-4 overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700">
                                <img
                                    src={
                                        billImage
                                    }
                                    alt="Bill"
                                    className="w-full object-cover"
                                />
                            </div>
                        )}
                    </div>

                    {/* Submitted */}
                    {submitted && (
                        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
                            Đã gửi yêu cầu
                            xác nhận thanh
                            toán. Vui lòng
                            chờ admin duyệt.
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-8 flex gap-3">
                        <button
                            onClick={() =>
                                navigate(-1)
                            }
                            className="flex-1 rounded-full border border-stone-300 dark:border-stone-700 py-3 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-stone-800"
                        >
                            Quay lại
                        </button>

                        <button
                            onClick={
                                handleSubmit
                            }
                            className="flex-1 rounded-full bg-[#B7848C] py-3 text-sm font-semibold text-white hover:opacity-90"
                        >
                            Tôi đã thanh toán
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}