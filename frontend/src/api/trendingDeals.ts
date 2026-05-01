import type { TrendingDealDto, TrendingDealsApiMeta } from '../types/trendingDeal'
import axios, { AxiosError } from 'axios'
import type { AxiosResponse } from 'axios'

/**
 * Base URL API:
 * - Dev (khuyến nghị): để trống → dùng `/api` + proxy Vite → localhost:8080
 * - Hoặc set VITE_API_BASE_URL=http://localhost:8080 (cần CORS trên backend)
 */
export function getApiBaseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL as string | undefined
  const normalized = v != null ? String(v).trim().replace(/\/$/, '') : ''
  // Nếu không dùng proxy Vite (/api → :8080), hãy set VITE_API_BASE_URL=http://localhost:8080.
  // Fallback dev: cho phép gọi thẳng backend khi chạy ở :5173 và không cấu hình proxy.
  return normalized || 'http://localhost:8080'
}

/**
 * Dev: mặc định gọi backend (nếu không set env).
 * Production: chỉ khi VITE_USE_TRENDING_API=true.
 */
export function resolveUseTrendingApi(): boolean {
  const raw = import.meta.env.VITE_USE_TRENDING_API
  const s = String(raw ?? '').toLowerCase().trim()
  if (s === 'false' || s === '0') return false
  if (s === 'true' || s === '1') return true
  // Mặc định: ưu tiên gọi backend; nếu DB trống thì hook sẽ fallback sang mock.
  return true
}

function readTrendingMetaFromAxios(res: AxiosResponse): TrendingDealsApiMeta | null {
  const computedAt = (res.headers['x-trending-computed-at'] as string | undefined) ?? null
  const next =
    (res.headers['x-trending-next-refresh-after'] as string | undefined) ?? null
  const ttlRaw =
    (res.headers['x-trending-cache-ttl-seconds'] as string | undefined) ?? null
  if (!computedAt || !next) return null
  const cacheTtlSeconds = ttlRaw != null ? Number(ttlRaw) : NaN
  return {
    computedAt,
    nextRefreshAfter: next,
    cacheTtlSeconds: Number.isFinite(cacheTtlSeconds) ? cacheTtlSeconds : 7200,
  }
}

function optionalScore(v: unknown): number | undefined {
  if (v == null) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function readImageUrls(raw: Record<string, unknown>): string[] | null {
  const v = raw.imageUrls
  if (!Array.isArray(v)) return null
  const arr = v
    .map((x) => (x == null ? '' : String(x).trim()))
    .filter((s) => s.length > 0)
  return arr.length > 0 ? arr : null
}

function readString(raw: Record<string, unknown>, key: string): string | null {
  const v = raw[key]
  if (v == null) return null
  const s = String(v).trim()
  return s.length > 0 ? s : null
}

function normalizeDeal(raw: Record<string, unknown>): TrendingDealDto {
  const pinned =
    typeof raw.pinned === 'boolean'
      ? raw.pinned
      : typeof raw.isPinned === 'boolean'
        ? raw.isPinned
        : false

  const product =
    raw.product != null && typeof raw.product === 'object'
      ? (raw.product as Record<string, unknown>)
      : null

  const imageUrls =
    readImageUrls(raw) ??
    (product ? readImageUrls(product) : null) ??
    null

  const imageUrl =
    imageUrls?.[0] ??
    readString(raw, 'imageUrl') ??
    readString(raw, 'imageURL') ??
    (product ? readString(product, 'imageUrl') : null) ??
    (product ? readString(product, 'imageURL') : null) ??
    null

  return {
    listingId: String(raw.listingId ?? ''),
    productId: String(raw.productId ?? ''),
    variantKey:
      raw.variantKey != null && raw.variantKey !== ''
        ? String(raw.variantKey)
        : undefined,
    productName: String(raw.productName ?? ''),
    imageUrl,
    imageUrls,
    platformName: String(raw.platformName ?? ''),
    currentPrice: Number(raw.currentPrice ?? 0),
    originalPrice:
      raw.originalPrice == null ? null : Number(raw.originalPrice),
    discountPercent: Number(raw.discountPercent ?? 0),
    isFlashSale: typeof raw.isFlashSale === 'boolean' ? raw.isFlashSale : undefined,
    dealScore: Number(raw.dealScore ?? 0),
    badge: String(raw.badge ?? ''),
    explanation: String(raw.explanation ?? ''),
    pinned,
    discountScore: optionalScore(raw.discountScore),
    trustScore: optionalScore(raw.trustScore),
    freshnessScore: optionalScore(raw.freshnessScore),
  }
}

export type TrendingDealsFetchResult = {
  deals: TrendingDealDto[]
  meta: TrendingDealsApiMeta | null
  /**
   * Dấu mốc thời gian do server cung cấp để phát hiện “backend chạy lại”.
   * Backend hiện có header X-Trending-Computed-At, nên dùng làm proxy cho serverStartTime.
   */
  serverStartTime: string | null
}

export async function fetchTrendingDeals(
  expand = false,
  opts?: { refresh?: boolean },
): Promise<TrendingDealsFetchResult> {
  const base = getApiBaseUrl()
  const url = `${base}/api/trending-deals`
  try {
    const res = await axios.get<unknown>(url, {
      params: {
        ...(expand ? { expand: true } : null),
        ...(opts?.refresh ? { refresh: true } : null),
      },
      headers: { Accept: 'application/json' },
    })

    const data: unknown = res.data
    if (!Array.isArray(data)) {
      throw new Error('API trả về không phải mảng')
    }

    const meta = readTrendingMetaFromAxios(res)
    const serverStartTime = meta?.computedAt ?? null

    return {
      deals: data.map((row) => normalizeDeal(row as Record<string, unknown>)),
      meta,
      serverStartTime,
    }
  } catch (e: unknown) {
    // Chuẩn hoá lỗi để hook dễ nhận biết "Network Error"
    if (axios.isAxiosError(e)) {
      const ae = e as AxiosError
      const status = ae.response?.status
      const statusText = ae.response?.statusText
      if (status != null) {
        throw new Error(`API ${status}: ${statusText || 'Request failed'}`)
      }
      // Không có response => lỗi network / CORS / server down
      throw new Error(ae.message || 'Network Error')
    }
    throw e
  }
}
