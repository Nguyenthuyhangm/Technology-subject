import { useCallback, useState } from 'react';
import type { MediaItem, ProductVideo } from '../../types/product';
import Badge from '../common/Badge';

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=70';

type ProductGalleryProps = {
  mediaItems: MediaItem[];
  title: string;
  showLowestBadge?: boolean;
};

export function buildMediaItems(images: string[], video?: ProductVideo | null): MediaItem[] {
  if (!video) return images.map((url) => ({ type: 'image' as const, url }));
  return [
    { type: 'video' as const, video },
    ...images.map((url) => ({ type: 'image' as const, url })),
  ];
}

export default function ProductGallery({ mediaItems, title, showLowestBadge = false }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [broken, setBroken] = useState<Record<number, boolean>>({});
  const [videoError, setVideoError] = useState(false);

  const activeItem = mediaItems[activeIndex];

  const thumbSrc = useCallback(
    (index: number) => {
      const item = mediaItems[index];
      if (!item) return FALLBACK_IMG;
      if (item.type === 'video') {
        return item.video.thumbnailUrl ?? FALLBACK_IMG;
      }
      return broken[index] ? FALLBACK_IMG : item.url;
    },
    [broken, mediaItems],
  );

  const mainSrc = useCallback(() => {
    if (!activeItem) return FALLBACK_IMG;
    if (activeItem.type === 'video') {
      return activeItem.video.thumbnailUrl ?? FALLBACK_IMG;
    }
    return broken[activeIndex] ? FALLBACK_IMG : activeItem.url;
  }, [activeItem, activeIndex, broken]);

  const onThumbError = (index: number) => {
    setBroken((prev) => ({ ...prev, [index]: true }));
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  return (
    <div className="rounded-[38px] border border-stone-200/70 dark:border-stone-700/40 bg-white dark:bg-[#1A1614] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
      <div className="mb-5 flex items-center justify-between">
        {showLowestBadge && <Badge variant="warning">Giá đẹp 90 ngày</Badge>}
      </div>

      <div className="grid gap-4 md:grid-cols-[92px_1fr]">
        <div className="order-2 flex gap-3 md:order-1 md:flex-col">
          {mediaItems.map((item, index) => (
            <button
              key={`${item.type}-${index}`}
              type="button"
              onClick={() => {
                setActiveIndex(index);
                if (item.type === 'video') setVideoError(false);
              }}
              className={`relative overflow-hidden rounded-[22px] border bg-white dark:bg-stone-800 transition ${
                activeIndex === index
                  ? 'border-[#D8C1C6] dark:border-[#8E6A72] shadow-sm'
                  : 'border-stone-200/80 dark:border-stone-700/60'
              }`}
            >
              {item.type === 'video' ? (
                <div className="relative w-full pt-[56.25%] bg-black">
                  <img src={thumbSrc(index)} alt="video" className="absolute inset-0 h-full w-full object-cover" onError={() => onThumbError(index)} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 shadow">
                      <svg className="h-3 w-3 text-stone-800" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M2 1.5L10.5 6 2 10.5V1.5z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={thumbSrc(index)}
                  alt={`${title}-${index}`}
                  className="h-20 w-20 object-cover"
                  onError={() => onThumbError(index)}
                />
              )}
            </button>
          ))}
        </div>

        <div className="order-1 rounded-[32px] bg-[#F6F1EB] dark:bg-stone-800/50 p-6 md:order-2">
          <div className="overflow-hidden rounded-[30px]">
            {activeItem?.type === 'video' && !videoError ? (
              <div className="relative w-full pt-[177.78%] bg-black">
                <video
                  key={`video-${activeItem.video.id}`}
                  src={activeItem.video.videoUrl}
                  controls
                  className="absolute inset-0 h-full w-full object-contain"
                  onError={handleVideoError}
                  poster={activeItem.video.thumbnailUrl ?? undefined}
                />
              </div>
            ) : activeItem?.type === 'video' && videoError ? (
              <div className="relative w-full pt-[177.78%] bg-stone-100 dark:bg-stone-900">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <svg className="h-10 w-10 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  <p className="text-sm text-stone-500 dark:text-stone-400 text-center px-4">
                    Không thể tải video giới thiệu sản phẩm.
                  </p>
                </div>
              </div>
            ) : (
              <img
                src={mainSrc()}
                alt={title}
                className="h-full w-full object-cover"
                onError={() => onThumbError(activeIndex)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
