import React, { useState } from "react";

export type PremiumPlan =
    | "MONTHLY"
    | "QUARTERLY"
    | "YEARLY";

export type PaymentMethod =
    | "CARD"
    | "BANK_QR"
    | "MOMO"
    | "ZALOPAY";

interface Props {
    open: boolean;
    loading?: boolean;
    onClose: () => void;
    onConfirm: (
        plan: PremiumPlan,
        method: PaymentMethod
    ) => void;
}

const plans = [
    {
        id: "MONTHLY" as PremiumPlan,
        title: "1 Tháng",
        original: 69000,
        sale: 29000,
        badge: "🔥 New User",
        desc: "Phù hợp trải nghiệm Premium",
    },
    {
        id: "QUARTERLY" as PremiumPlan,
        title: "3 Tháng",
        original: 199000,
        sale: 99000,
        badge: "⭐ Popular",
        desc: "Tiết kiệm hơn gói tháng",
    },
    {
        id: "YEARLY" as PremiumPlan,
        title: "1 Năm",
        original: 659000,
        sale: 359000,
        badge: "👑 Best Value",
        desc: "Giá tốt nhất cho người dùng lâu dài",
    },
];

const methods = [
    {
        id: "CARD" as PaymentMethod,
        title: "Thẻ ngân hàng",
        desc: "Visa / MasterCard / ATM",
        icon: "💳",
    },
    {
        id: "BANK_QR" as PaymentMethod,
        title: "QR Banking",
        desc: "Quét QR bằng app ngân hàng",
        icon: "🏦",
    },
    {
        id: "MOMO" as PaymentMethod,
        title: "MoMo Wallet",
        desc: "Thanh toán bằng ví MoMo",
        icon: "🟣",
    },
    {
        id: "ZALOPAY" as PaymentMethod,
        title: "ZaloPay",
        desc: "Thanh toán bằng ví ZaloPay",
        icon: "🔵",
    },
];

function formatVND(value: number) {
    return new Intl.NumberFormat("vi-VN").format(value);
}

export default function PaymentMethodModal({
                                                 open,
                                                 loading = false,
                                                 onClose,
                                                 onConfirm,
                                             }: Props) {
    const [step, setStep] = useState<1 | 2>(1);

    const [selectedPlan, setSelectedPlan] =
        useState<PremiumPlan>("MONTHLY");

    const [selectedMethod, setSelectedMethod] =
        useState<PaymentMethod>("CARD");

    if (!open) return null;

    const handleClose = () => {
        setStep(1);
        setSelectedPlan("MONTHLY");
        setSelectedMethod("CARD");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-xl rounded-[28px] bg-white dark:bg-[#1A1614] p-6 shadow-xl">

                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                            Upgrade Premium
                        </h2>
                        <p className="text-sm text-stone-500">
                            Step {step}/2
                        </p>
                    </div>

                    <button
                        onClick={handleClose}
                        className="text-stone-400 hover:text-stone-700"
                    >
                        ✕
                    </button>
                </div>

                {/* STEP 1 */}
                {step === 1 && (
                    <div className="space-y-4">
                        {plans.map((plan) => (
                            <button
                                key={plan.id}
                                onClick={() =>
                                    setSelectedPlan(
                                        plan.id
                                    )
                                }
                                className={`w-full rounded-3xl border p-5 text-left transition ${
                                    selectedPlan ===
                                    plan.id
                                        ? "border-[#B7848C] bg-[#FBF3F4] dark:bg-[#2A1A1D]/50"
                                        : "border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"
                                }`}
                            >
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-3 py-1 text-xs font-semibold">
                                        {plan.badge}
                                    </span>

                                    {selectedPlan ===
                                        plan.id && (
                                            <span className="font-bold text-[#B7848C]">
                                            ✓
                                        </span>
                                        )}
                                </div>

                                <p className="text-base font-semibold text-stone-900 dark:text-stone-100">
                                    {plan.title}
                                </p>

                                <div className="mt-2 flex items-center gap-3">
                                    <span className="text-sm text-stone-400 line-through">
                                        {formatVND(
                                            plan.original
                                        )}đ
                                    </span>

                                    <span className="text-xl font-bold text-[#B7848C]">
                                        {formatVND(
                                            plan.sale
                                        )}đ
                                    </span>
                                </div>

                                <p className="mt-2 text-sm text-stone-500">
                                    {plan.desc}
                                </p>
                            </button>
                        ))}

                        <button
                            onClick={() =>
                                setStep(2)
                            }
                            className="mt-4 w-full rounded-full bg-[#B7848C] py-3 text-sm font-semibold text-white hover:opacity-90"
                        >
                            Tiếp tục
                        </button>
                    </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                    <div className="space-y-4">
                        {methods.map((m) => (
                            <button
                                key={m.id}
                                onClick={() =>
                                    setSelectedMethod(
                                        m.id
                                    )
                                }
                                className={`w-full rounded-2xl border p-4 text-left transition ${
                                    selectedMethod ===
                                    m.id
                                        ? "border-[#B7848C] bg-[#FBF3F4] dark:bg-[#2A1A1D]/50"
                                        : "border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-2xl">
                                        {m.icon}
                                    </div>

                                    <div className="flex-1">
                                        <p className="font-semibold text-stone-900 dark:text-stone-100">
                                            {m.title}
                                        </p>
                                        <p className="text-sm text-stone-500">
                                            {m.desc}
                                        </p>
                                    </div>

                                    {selectedMethod ===
                                        m.id && (
                                            <span className="font-bold text-[#B7848C]">
                                            ✓
                                        </span>
                                        )}
                                </div>
                            </button>
                        ))}

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() =>
                                    setStep(1)
                                }
                                className="flex-1 rounded-full border border-stone-300 py-3 text-sm font-semibold"
                            >
                                Quay lại
                            </button>

                            <button
                                disabled={loading}
                                onClick={() =>
                                    onConfirm(
                                        selectedPlan,
                                        selectedMethod
                                    )
                                }
                                className="flex-1 rounded-full bg-[#B7848C] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                            >
                                {loading
                                    ? "Đang xử lý..."
                                    : "Thanh toán"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}