import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import VideoProductPopup from '../components/video/VideoProductPopup';
import { getActiveVideos } from '../service/ProductService';
import type { VideoWithProduct } from '../types/product';

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

function getYouTubeEmbedUrl(youtubeId: string | null | undefined): string {
  if (!youtubeId) return '';
  return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&playsinline=1`;
}

export default function VideoFeedPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const startVideoId = searchParams.get('startVideoId');
  const startVideo = searchParams.get('startVideo');

  const [videos, setVideos] = useState<VideoWithProduct[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [iframeKeys, setIframeKeys] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getActiveVideos()
      .then((data) => {
        if (cancelled) return;

        let ordered = [...data];

        if (startVideoId) {
          const sameProduct = ordered.filter(v => v.productId === startVideoId);
          const others = ordered.filter(v => v.productId !== startVideoId);

          for (let i = others.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [others[i], others[j]] = [others[j], others[i]];
          }

          if (startVideo) {
            const sv = sameProduct.find(v => v.videoId === startVideo);
            const rest = sameProduct.filter(v => v.videoId !== startVideo);
            ordered = sv ? [sv, ...rest, ...others] : [...sameProduct, ...others];
          } else {
            ordered = [...sameProduct, ...others];
          }
        }

        setVideos(ordered);
        setIframeKeys(ordered.map(v => v.videoId));

        const startIdx = startVideo
          ? ordered.findIndex(v => v.videoId === startVideo)
          : (startVideoId ? ordered.findIndex(v => v.productId === startVideoId) : 0);
        if (startIdx !== -1) {
          setCurrentIndex(startIdx);
        }
      })
      .catch((err) => {
        console.error('[VideoFeedPage] getActiveVideos failed:', err);
        if (!cancelled) setVideos([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [startVideoId]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || videos.length === 0) return;

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);

    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, videos.length]);

  const handleBack = () => {
    const backUrl = startVideoId
      ? `/product/${startVideoId}`
      : videos.length > 0
        ? `/product/${videos[0].productId}`
        : '/';
    navigate(backUrl);
  };

  if (loading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: '#FCF8F4', fontFamily: FONT_STACK.sans }}
      >
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#8D7663] border-t-transparent" />
          <p className="text-sm text-stone-400">Đang tải video...</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: '#FCF8F4', fontFamily: FONT_STACK.sans }}
      >
        <div className="text-center px-6">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#F7ECEE]">
            <svg
              className="h-10 w-10 text-[#B7848C]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
              />
            </svg>
          </div>
          <h2
            className="text-2xl text-stone-900"
            style={{ fontFamily: FONT_STACK.serif }}
          >
            Chưa có video nào
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            Hiện tại chưa có video sản phẩm nào được cập nhật.
          </p>
          <button
            onClick={handleBack}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1F1A17] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: '#0F0D0C', fontFamily: FONT_STACK.sans }}
    >
      {/* Top Header Bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-3 lg:px-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3.5 py-2 text-xs text-white backdrop-blur-sm transition hover:bg-black/70"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Quay lại</span>
        </button>

        <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-white/80">
          Video sản phẩm
        </h1>

        <div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
          <span className="font-semibold text-white">{currentIndex + 1}</span>
          <span className="text-white/50">/</span>
          <span className="text-white/70">{videos.length}</span>
        </div>
      </div>

      {/* Video Feed */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full snap-y snap-mandatory overflow-y-scroll scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {videos.map((video, idx) => (
          <div
            key={video.videoId}
            className="relative h-screen w-screen shrink-0 snap-start overflow-hidden"
          >
            {/* Video iframe */}
            <iframe
              ref={(el) => { iframeRefs.current[idx] = el; }}
              key={iframeKeys[idx]}
              className="absolute inset-0 h-full w-full"
              src={idx === currentIndex ? getYouTubeEmbedUrl(video.youtubeId) : 'about:blank'}
              title={`video-${video.videoId}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />

            {/* Tap-to-play overlay */}
            {idx !== currentIndex && (
              <button
                onClick={() => {
                  if (containerRef.current) {
                    containerRef.current.scrollTo({
                      top: idx * containerRef.current.clientHeight,
                      behavior: 'smooth',
                    });
                  }
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity z-10"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm">
                  <Play className="ml-1 h-7 w-7 text-stone-900" fill="currentColor" />
                </div>
              </button>
            )}

            {/* Product Popup */}
            <VideoProductPopup
              productId={video.productId}
              productName={video.productName}
              imageUrl={video.productImageUrl}
              price={video.bestPrice}
              platform={video.bestPlatform}
              position="bottom-left"
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
              <div
                className="h-full bg-[#B7848C] transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / videos.length) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Dots */}
      <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 sm:right-5">
        {videos.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (containerRef.current) {
                containerRef.current.scrollTo({
                  top: idx * containerRef.current.clientHeight,
                  behavior: 'smooth',
                });
              }
            }}
            className={`h-2 w-2 rounded-full transition-all ${
              idx === currentIndex
                ? 'scale-150 bg-[#B7848C]'
                : 'bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>

      {currentIndex === 0 && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 z-20 -translate-x-1/2 animate-bounce text-xs text-white/50">
          Kéo lên xem video tiếp
        </div>
      )}
    </div>
  );
}
