import { Link } from 'react-router-dom'
import type { TrendingDealDto } from '../../types/trendingDeal'
import {
  TRENDING_DEAL_FONT_STACK,
  formatTrendingDealVnd,
  trendingDealBadgeClass,
} from '../../util/trendingDealFormat'
import { TrendingDealScoreBreakdown } from './TrendingDealScoreBreakdown'
import { useState } from 'react'
import { getApiBaseUrl } from '../../api/trendingDeals'

function addUnsplashDefaults(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname !== 'images.unsplash.com') return url
    if (!u.searchParams.has('auto')) u.searchParams.set('auto', 'format')
    if (!u.searchParams.has('fit')) u.searchParams.set('fit', 'crop')
    if (!u.searchParams.has('w')) u.searchParams.set('w', '600')
    if (!u.searchParams.has('q')) u.searchParams.set('q', '80')
    return u.toString()
  } catch {
    return url
  }
}

function resolveDealImageSrc(imageUrl: string | null): string | null {
  const raw = (imageUrl ?? '').trim()
  if (!raw) return null
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://'))
    return addUnsplashDefaults(raw)
  if (raw.startsWith('//')) return `https:${raw}`
  const base = getApiBaseUrl()
  const abs = raw.startsWith('/') ? `${base}${raw}` : `${base}/${raw}`
  return addUnsplashDefaults(abs)
}

export function TrendingDealRow({
  d,
  nested = false,
  onImageError,
}: {
  d: TrendingDealDto
  nested?: boolean
  onImageError?: (listingId: string) => void
}) {
  const [imgBroken, setImgBroken] = useState(false)
  const candidate =
    d.imageUrls && Array.isArray(d.imageUrls) && d.imageUrls.length > 0
      ? d.imageUrls[0]
      : d.imageUrl
  const imgSrc = resolveDealImageSrc(candidate ?? null)
  const showImage = !imgBroken && imgSrc != null

  const rowBestPrice = Math.round(Number(d.currentPrice))
  const rowListPrice =
    d.originalPrice != null && Number.isFinite(Number(d.originalPrice))
      ? Math.round(Number(d.originalPrice))
      : null
  const rowShowOrigStrike =
    rowListPrice != null && rowListPrice > 0 && rowListPrice > rowBestPrice
  const rowDiscountPct =
    rowShowOrigStrike && rowListPrice != null
      ? Math.min(100, Math.max(0, Math.round(((rowListPrice - rowBestPrice) / rowListPrice) * 100)))
      : 0

  const dealScorePct = Math.round(Math.min(1, Math.max(0, d.dealScore)) * 100)

  return (
    <div className={nested ? 'max-w-full' : ''}>
      <Link
        to={`/product/${d.productId}`}
        className={`group flex flex-col gap-5 rounded-[28px] border border-stone-200/80 dark:border-stone-700/40 bg-white/80 dark:bg-[#1A1614]/80 p-6 backdrop-blur-sm transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(33,24,19,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8E6A72] sm:flex-row sm:items-stretch ${
          nested ? 'shadow-sm' : 'shadow-[0_10px_30px_rgba(33,24,19,0.05)]'
        }`}
      >
        {/* Image */}
        <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[#F5EEE8] dark:bg-stone-800 transition-all duration-500 ${
          nested ? 'h-20 w-20' : 'h-28 w-28'
        }`}>
          {showImage ? (
            <img
              src={imgSrc}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => {
                if (!imgBroken) {
                  setImgBroken(true)
                  onImageError?.(d.listingId)
                }
              }}
              className="h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] text-stone-400">
              Không có ảnh
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${trendingDealBadgeClass(d.badge)}`}>
              {d.badge}
            </span>
            <span className="text-[10px] text-stone-400 dark:text-stone-500">{d.platformName}</span>
          </div>

          <h3
            className="line-clamp-2 text-[1.35rem] leading-[1.2] tracking-[-0.02em] text-stone-900 dark:text-stone-100 transition-colors group-hover:text-[#5C3D45]"
            style={{ fontFamily: TRENDING_DEAL_FONT_STACK.serif }}
          >
            {d.productName}
          </h3>

          {d.explanation && (
            <p className="line-clamp-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              {d.explanation}
            </p>
          )}

        </div>

        {/* Price */}
        <div className="shrink-0 sm:flex sm:min-w-[148px] sm:flex-col sm:justify-center sm:border-l sm:border-stone-200/60 dark:sm:border-stone-700/40 sm:pl-6">
          <p className="text-[10px] uppercase tracking-[0.08em] text-stone-400 dark:text-stone-500">
            Giá tốt nhất
          </p>
          <p className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-stone-900 dark:text-stone-100">
            {formatTrendingDealVnd(rowBestPrice)}
          </p>

          {rowShowOrigStrike && rowListPrice != null && (
            <p className="mt-0.5 text-xs text-stone-400 line-through">
              {formatTrendingDealVnd(rowListPrice)}
            </p>
          )}

          {rowDiscountPct > 0 && (
            <span className="mt-2 inline-flex w-fit items-center rounded-full bg-[#FBF3F4] dark:bg-[#2A1A1D]/60 px-2.5 py-0.5 text-[11px] font-semibold text-[#B7848C]">
              -{rowDiscountPct}%
            </span>
          )}

          {/* Deal score pill */}
          
          
        </div>
      </Link>
    </div>
  )
}