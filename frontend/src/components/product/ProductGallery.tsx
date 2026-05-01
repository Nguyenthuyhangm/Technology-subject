import { useCallback, useState } from 'react';
import Badge from '../common/Badge';

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=70';

type ProductGalleryProps = {
  images: string[];
  title: string;
  showLowestBadge?: boolean;
};

export default function ProductGallery({
  images,
  title,
  showLowestBadge = false,
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [broken, setBroken] = useState<Record<number, boolean>>({});

  const srcAt = useCallback(
    (index: number) => {
      const imgs = images.length > 0 ? images : [FALLBACK_IMG];
      return broken[index] ? FALLBACK_IMG : imgs[index];
    },
    [broken, images],
  );

  const onThumbError = (index: number) => {
    setBroken((prev) => ({ ...prev, [index]: true }));
  };

  return (
    <div className="rounded-[38px] border border-stone-200/70 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
      <div className="mb-5 flex items-center justify-between">
        {showLowestBadge && <Badge variant="warning">Giá đẹp 90 ngày</Badge>}
      </div>

      <div className="grid gap-4 md:grid-cols-[92px_1fr]">
        <div className="order-2 flex gap-3 md:order-1 md:flex-col">
          {(images || []).map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`overflow-hidden rounded-[22px] border bg-white transition ${
                activeIndex === index
                  ? 'border-[#D8C1C6] shadow-sm'
                  : 'border-stone-200/80'
              }`}
            >
              <img
                src={srcAt(index)}
                alt={`${title}-${index}`}
                className="h-20 w-20 object-cover"
                onError={() => onThumbError(index)}
              />
            </button>
          ))}
        </div>

        <div className="order-1 rounded-[32px] bg-[#F6F1EB] p-6 md:order-2">
          <div className="aspect-square overflow-hidden rounded-[30px]">
            <img
             src={images?.[activeIndex] || ''}
              alt={title}
              className="h-full w-full object-cover"
              onError={() => onThumbError(activeIndex)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
