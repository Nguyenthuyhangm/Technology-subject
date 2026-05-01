import { Eye, ShieldAlert, TrendingDown, Wallet } from 'lucide-react';
import type { PriceInsight } from '../../types/product';

type PriceInsightCardsProps = {
  insight: PriceInsight;
};

export default function PriceInsightCards({
  insight,
}: PriceInsightCardsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-[30px] border border-stone-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E6A72]">
          Price perspective
        </p>

        <h3
          className="mt-3 text-3xl text-stone-900"
          style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' }}
        >
          Mức giá đang kể điều gì
        </h3>

        <div className="mt-5 space-y-4">
          <p className="flex items-start gap-3 text-sm leading-7 text-stone-700">
            <TrendingDown size={17} className="mt-1 shrink-0 text-[#8E6A72]" />
            Thấp hơn trung bình 30 ngày{' '}
            <span className="font-medium">{insight.lowerThanAvg30dPercent}%</span>,
            cho thấy mức giá hiện tại đang khá hấp dẫn để cân nhắc.
          </p>

          <p className="flex items-start gap-3 text-sm leading-7 text-stone-700">
            <Wallet size={17} className="mt-1 shrink-0 text-[#8E6A72]" />
            {insight.isLowest90Days
              ? 'Sản phẩm đang ở vùng giá rất đẹp trong 90 ngày gần đây.'
              : 'Mức giá hiện tại vẫn chưa phải đáy dài hạn, nhưng đã tiến gần một vùng đáng chú ý.'}
          </p>
        </div>
      </div>

      <div className="rounded-[30px] border border-stone-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8E6A72]">
          Buying guidance
        </p>

        <h3
          className="mt-3 text-3xl text-stone-900"
          style={{ fontFamily: ' Georgia, Cambria, "Times New Roman", Times, serif' }}
        >
          Bạn nên nhìn theo hướng nào
        </h3>

        <div className="mt-5 space-y-4">
          <p className="flex items-start gap-3 text-sm leading-7 text-stone-700">
            <ShieldAlert size={17} className="mt-1 shrink-0 text-[#8E6A72]" />
            {insight.isFakeDiscountRisk
              ? 'Vẫn có tín hiệu cần theo dõi thêm trước khi quyết định mua ngay.'
              : 'Mức giảm hiện tại khá ổn định và không có dấu hiệu gây bối rối về mặt giá.'}
          </p>

          <p className="flex items-start gap-3 text-sm leading-7 text-stone-700">
            <Eye size={17} className="mt-1 shrink-0 text-[#8E6A72]" />
            {insight.recommendation === 'buy-now'
              ? 'Đây là thời điểm khá phù hợp để mua nếu bạn đang cần sản phẩm này.'
              : insight.recommendation === 'wait'
              ? 'Bạn có thể chờ thêm một nhịp nếu chưa cần mua ngay.'
              : 'Nên lưu lại và tiếp tục theo dõi trước khi ra quyết định.'}
          </p>
        </div>
      </div>
    </div>
  );
}