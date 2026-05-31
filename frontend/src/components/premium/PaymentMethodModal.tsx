import { useState } from "react";

export type PremiumPlan = "MONTHLY" | "QUARTERLY" | "YEARLY";

interface Props {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (plan: PremiumPlan) => void;
}

const plans: {
  id: PremiumPlan;
  title: string;
  subtitle: string;
  original: number;
  sale: number;
  badge?: string;
}[] = [
  {
    id: "MONTHLY",
    title: "1 Tháng",
    subtitle: "Dùng thử linh hoạt",
    original: 69000,
    sale: 49000, // Giá chân rết (chim mồi)
  },
  {
    id: "QUARTERLY",
    title: "3 Tháng",
    subtitle: "Tiết kiệm 35% chi phí",
    original: 199000,
    sale: 99000, // Gói quốc dân dễ xuống tiền
    badge: "Phổ biến",
  },
  {
    id: "YEARLY",
    title: "1 Năm",
    subtitle: "Tính ra chỉ 25.000đ / tháng",
    original: 659000,
    sale: 299000, // Deal siêu hời thu hút dòng tiền
    badge: "Hời nhất",
  },
];

const formatVND = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

export default function PaymentMethodModal({ open, loading = false, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<PremiumPlan>("QUARTERLY");

  if (!open) return null;

  return (
    /* Lớp nền: Chỉ làm tối nhẹ 20%, không làm mờ */
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/20 px-0 sm:px-4">
      {/* Tăng kích thước khung lên max-w-[420px] và bo góc đồng bộ rộng rãi hơn */}
      <div className="w-full sm:max-w-[420px] rounded-t-[32px] sm:rounded-[28px] bg-white dark:bg-[#1C1917] shadow-xl overflow-hidden border border-stone-200/40 dark:border-stone-800/40">
        
        {/* Mobile Handle Bar */}
        <div className="flex justify-center pt-4 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-stone-200 dark:bg-stone-800" />
        </div>

        {/* Nới rộng padding trong khung (px-8 py-7) để layout thoáng đãng */}
        <div className="px-8 pb-8 pt-6">
          {/* Header - Chữ mảnh, tinh tế */}
          <div className="text-center mb-6">
            <h2 className="text-[17px] font-semibold text-stone-800 dark:text-stone-100 tracking-tight">
              Nâng cấp Premium
            </h2>
            <p className="mt-1 text-stone-400 dark:text-stone-500 text-[11px] font-normal uppercase tracking-wider">
              Mở khóa sức mạnh PriceHawk
            </p>
          </div>

          {/* Benefits List */}
          <div className="mb-6 space-y-2.5 bg-stone-50/60 dark:bg-stone-900/20 p-4 rounded-xl border border-stone-100/50 dark:border-stone-800/50">
            {["Không giới hạn thông báo giá", "Theo dõi sản phẩm không giới hạn"].map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-[12.5px] text-stone-500 dark:text-stone-400 font-normal">
                <svg className="w-3.5 h-3.5 text-[#B7848C] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </div>
            ))}
          </div>

          {/* Plans Selection */}
          <div className="space-y-3 mb-6">
            {plans.map((plan) => {
              const isSelected = selected === plan.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelected(plan.id)}
                  className={`relative w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-[#B7848C] bg-[#B7848C]/[0.02]"
                      : "border-stone-100 dark:border-stone-800 bg-transparent hover:border-stone-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3.5">
                      {/* Radio button */}
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected ? "border-[#B7848C] bg-[#B7848C]" : "border-stone-300 dark:border-stone-600"
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      
                      <div className="leading-tight">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13.5px] font-medium ${isSelected ? "text-stone-900 dark:text-stone-50" : "text-stone-600 dark:text-stone-400"}`}>
                            {plan.title}
                          </span>
                          {plan.badge && (
                            <span className="bg-[#B7848C]/10 text-[#B7848C] text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5 font-normal">{plan.subtitle}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[14px] font-semibold text-stone-800 dark:text-stone-100">
                        {formatVND(plan.sale)}đ
                      </div>
                      <div className="text-[10.5px] text-stone-300 dark:text-stone-600 line-through font-normal">
                        {formatVND(plan.original)}đ
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <button
            disabled={loading}
            onClick={() => onConfirm(selected)}
            className="w-full rounded-xl bg-[#B7848C] py-3.5 text-white font-medium text-[13px] tracking-wide transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
               <div className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-[12.5px] font-normal">Đang kết nối...</span>
               </div>
            ) : (
              "Nâng cấp ngay"
            )}
          </button>
          
          <button 
            onClick={onClose}
            className="w-full mt-4 text-[11px] text-stone-400 font-normal hover:text-stone-600 dark:hover:text-stone-300 transition-colors uppercase tracking-widest text-center"
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
}