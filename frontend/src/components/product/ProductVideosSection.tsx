import { useEffect, useRef, useState } from 'react';

type Video = {
  id: string;
  youtubeId: string;
  videoUrl: string;
  thumbnailUrl: string;
};

type ProductVideosSectionProps = {
  productId: string;
};

export default function ProductVideosSection({ productId }: ProductVideosSectionProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([]);

  useEffect(() => {
    fetch(`/products/${productId}/videos`)
      .then((res) => res.json())
      .then((data) => {
        setVideos(Array.isArray(data) ? data : []);
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    videos.forEach((_, i) => {
      const iframe = iframeRefs.current[i];
      if (!iframe) return;
      if (i === 0 || hoveredIndex === i) {
        const url = new URL(videos[i].videoUrl);
        url.searchParams.set('autoplay', '1');
        url.searchParams.set('mute', '1');
        url.searchParams.set('controls', '0');
        url.searchParams.set('rel', '0');
        url.searchParams.set('modestbranding', '1');
        iframe.src = url.toString();
      } else {
        iframe.src = '';
      }
    });
  }, [videos, hoveredIndex]);

  if (loading) return null;
  if (videos.length === 0) {
    return (
      <section className="mt-10">
        <p className="text-lg font-semibold mb-4">Video về sản phẩm</p>
        <div className="flex items-center justify-center rounded-[20px] border border-dashed border-stone-200 dark:border-stone-700 bg-white/50 dark:bg-stone-900/50 py-12">
          <p className="text-stone-400 dark:text-stone-500 text-sm italic">Không có video phù hợp</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <p className="text-lg font-semibold mb-4">Video về sản phẩm</p>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.min(videos.length, 4)}, 1fr)`,
        }}
      >
        {videos.map((video, i) => (
          <div
            key={video.id}
            className="relative overflow-hidden rounded-xl bg-black"
            style={{ aspectRatio: '16/9' }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <iframe
              ref={(el) => { iframeRefs.current[i] = el; }}
              className="absolute inset-0 h-full w-full"
              src=""
              title={`video-${i}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            {i !== 0 && hoveredIndex !== i && (
              <img
                src={video.thumbnailUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
