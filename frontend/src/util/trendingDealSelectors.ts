import type { ProductSearch } from '../types/product'
import type { TrendingDealDto } from '../types/trendingDeal'
import { getApiBaseUrl } from '../api/trendingDeals'
import { normalizeOfferPrices } from './normalizeOfferPrices'

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function addUnsplashDefaults(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname !== 'images.unsplash.com') return url
    if (!u.searchParams.has('auto')) u.searchParams.set('auto', 'format')
    if (!u.searchParams.has('fit')) u.searchParams.set('fit', 'crop')
    if (!u.searchParams.has('w')) u.searchParams.set('w', '900')
    if (!u.searchParams.has('q')) u.searchParams.set('q', '80')
    return u.toString()
  } catch {
    return url
  }
}

export function trendingDealToProductSearch(d: TrendingDealDto): ProductSearch {
  const rawCandidate =
    d.imageUrls && Array.isArray(d.imageUrls) && d.imageUrls.length > 0
      ? d.imageUrls[0]
      : d.imageUrl
  const raw = (rawCandidate ?? '').trim()
  const base = getApiBaseUrl()
  const image = (raw
    ? raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('blob:')
      ? addUnsplashDefaults(raw)
      : raw.startsWith('//')
        ? `https:${raw}`
        : raw.startsWith('/')
          ? addUnsplashDefaults(`${base}${raw}`)
          : addUnsplashDefaults(`${base}/${raw}`)
    : '') as string

  // Giá gốc lấy từ DTO (PriceRecord.originalPrice trên backend); chuẩn hóa + tính % giảm.
  const rawOriginal =
    d.originalPrice != null && Number.isFinite(Number(d.originalPrice))
      ? Number(d.originalPrice)
      : d.currentPrice
  const n = normalizeOfferPrices(d.currentPrice, rawOriginal)

  const platform = {
    platform: d.platformName,
    url: '',
    platformImageUrl: '',
    finalPrice: n.price,
    originalPrice: n.originalPrice,
    discountPct: n.discountPct,
    isOfficial: false,
  }

  return {
    id: d.productId,
    name: d.productName,
    brand: '',
    model: '',
    category: '',
    images: image ? [image] : [],
    description: '',
    categoryName: '',
    brandName: '',
    score: clamp01(d.dealScore ?? 0),
    imageUrl: image,
    platforms: [platform],
  }
}

export function sortByDealScoreDesc(a: TrendingDealDto, b: TrendingDealDto): number {
  const ds = (b.dealScore ?? 0) - (a.dealScore ?? 0)
  if (Math.abs(ds) > 1e-9) return ds
  const dp = (b.discountPercent ?? 0) - (a.discountPercent ?? 0)
  if (Math.abs(dp) > 1e-9) return dp
  return String(a.productId).localeCompare(String(b.productId))
}

export function sortByDiscountPercentDesc(
  a: TrendingDealDto,
  b: TrendingDealDto,
): number {
  const dp = (b.discountPercent ?? 0) - (a.discountPercent ?? 0)
  if (Math.abs(dp) > 1e-9) return dp
  const ds = (b.dealScore ?? 0) - (a.dealScore ?? 0)
  if (Math.abs(ds) > 1e-9) return ds
  return String(a.productId).localeCompare(String(b.productId))
}

export function extractLastUpdatedAtFromExplanation(explanation: string): Date | null {
  // Backend format (vi-VN): "Cập nhật giá gần nhất: dd/MM/yyyy HH:mm."
  const m = /Cập nhật giá gần nhất:\s*(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/.exec(
    explanation ?? '',
  )
  if (!m) return null

  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  const hour = Number(m[4])
  const minute = Number(m[5])

  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null
  }

  return new Date(year, month - 1, day, hour, minute, 0, 0)
}

export function isDealOlderThanDays(d: TrendingDealDto, days: number, now = new Date()): boolean {
  const t = extractLastUpdatedAtFromExplanation(d.explanation ?? '')
  if (!t) return false
  const diffMs = now.getTime() - t.getTime()
  if (!Number.isFinite(diffMs)) return false
  return diffMs >= days * 24 * 60 * 60 * 1000
}

