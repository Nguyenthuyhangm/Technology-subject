import { Link } from 'react-router-dom';
import { ExternalLink, ShoppingBag } from 'lucide-react';
import PlatformPill from '../common/PlatformPill';

type VideoProductPopupProps = {
  productId: string;
  productName: string;
  imageUrl: string;
  price: number;
  platform: string;
  /** Position: 'bottom-left' | 'bottom-center' */
  position?: 'bottom-left' | 'bottom-center';
};

const formatPrice = (price: number) => {
  if (!price) return 'Đang cập nhật';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);
};

export default function VideoProductPopup({
  productId,
  productName,
  imageUrl,
  price,
  platform,
  position = 'bottom-left',
}: VideoProductPopupProps) {
  return (
    <div
      className={`
        absolute z-10 w-72 max-w-[calc(100vw-2rem)]
        rounded-2xl border border-white/20 bg-white/90
        dark:bg-[#1A1614]/90 backdrop-blur-md
        shadow-deep ring-1 ring-black/5
        pointer-events-auto
        transition-all duration-300
        ${position === 'bottom-left'
          ? 'left-4 bottom-20 sm:left-6 sm:bottom-24'
          : 'left-1/2 -translate-x-1/2 bottom-20 sm:bottom-24'
        }
      `}
      style={{
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Accent bar */}
      <div className="h-1 rounded-t-2xl bg-gradient-to-r from-[#B7848C] to-[#8E6A72]" />

      <div className="p-4">
        {/* Product row */}
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F4EEE7] dark:bg-stone-800">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={productName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ShoppingBag
                  className="h-6 w-6 text-stone-300 dark:text-stone-600"
                  strokeWidth={1.5}
                />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h3 className="line-clamp-2 text-sm font-medium leading-snug text-stone-900 dark:text-stone-100">
              {productName}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-[#B7848C]">
                {formatPrice(price)}
              </span>
              <PlatformPill platform={platform} compact />
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Link
          to={`/product/${productId}`}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#1F1A17] dark:bg-stone-700 px-3 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
        >
          <span>Xem sản phẩm</span>
          <ExternalLink size={13} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
