import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import PlatformPill from '../common/PlatformPill';

type VideoFeedCardProps = {
  productId: string;
  productName: string;
  imageUrl: string;
  price: number;
  platform: string;
};

const formatPrice = (price: number) => {
  if (!price) return 'Đang cập nhật';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(price);
};

export default function VideoFeedCard({ productId, productName, imageUrl, price, platform }: VideoFeedCardProps) {
  return (
    <div className="p-4 sm:p-6">
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#F4EEE7] dark:bg-stone-800">
          {imageUrl ? (
            <img src={imageUrl} alt={productName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg className="h-8 w-8 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <h3 className="line-clamp-2 text-base font-medium text-stone-900 dark:text-stone-100">
            {productName}
          </h3>
          
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-[#B7848C]">
              {formatPrice(price)}
            </span>
            <PlatformPill platform={platform} compact />
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <Link
        to={`/product/${productId}`}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#1F1A17] dark:bg-stone-700 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
      >
        <span>Xem chi tiết sản phẩm</span>
        <ExternalLink size={16} />
      </Link>
    </div>
  );
}
