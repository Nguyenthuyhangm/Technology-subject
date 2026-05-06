import { useEffect, useState } from 'react'
import { fetchTrendingDeals, resolveUseTrendingApi } from '../api/trendingDeals'
import { mockTrendingDealCandidates } from '../data/mockDeals'
import type { TrendingDealDto, TrendingDealsApiMeta } from '../types/trendingDeal'

const TRENDING_CACHE_KEY = 'trendingDeals:cache:v1'
const TRENDING_CACHE_TTL_MS = 30 * 60 * 1000 // 30 phút

type TrendingDealsSessionCache = {
  savedAtMs: number
  /**
   * “Dấu mốc backend” để phát hiện chạy lại.
   * Backend hiện có `X-Trending-Computed-At`; ta lưu lại để so sánh.
   */
  serverStartTime: string | null
  meta: TrendingDealsApiMeta | null
  deals: TrendingDealDto[]
}

function safeParseCache(raw: string | null): TrendingDealsSessionCache | null {
  if (!raw) return null
  try {
    const obj: unknown = JSON.parse(raw)
    if (obj == null || typeof obj !== 'object') return null
    const anyObj = obj as Record<string, unknown>
    const savedAtMs = Number(anyObj.savedAtMs)
    const deals = anyObj.deals
    if (!Number.isFinite(savedAtMs) || !Array.isArray(deals)) return null
    return obj as TrendingDealsSessionCache
  } catch {
    return null
  }
}

function readCacheNow(): TrendingDealsSessionCache | null {
  return safeParseCache(sessionStorage.getItem(TRENDING_CACHE_KEY))
}

function writeCacheNow(next: TrendingDealsSessionCache) {
  sessionStorage.setItem(TRENDING_CACHE_KEY, JSON.stringify(next))
}

function clearCacheNow() {
  sessionStorage.removeItem(TRENDING_CACHE_KEY)
}

function isCacheFresh(savedAtMs: number) {
  return Date.now() - savedAtMs <= TRENDING_CACHE_TTL_MS
}

function isNetworkErrorMessage(msg: string) {
  const s = msg.toLowerCase()
  return s.includes('network error') || s.includes('failed to fetch')
}

/**
 * Bắt lỗi 5xx từ message dạng "API 500: Internal Server Error" do
 * `fetchTrendingDeals` chuẩn hoá. Khi backend trả 5xx, dữ liệu cũ trong cache
 * không còn đáng tin (giá cũ / deal đã hết hạn) → cần xoá để tránh đánh lừa
 * người dùng.
 */
function isServerErrorMessage(msg: string): boolean {
  const m = /^API\s+(\d{3})\b/i.exec(msg)
  if (!m) return false
  const status = Number(m[1])
  return Number.isFinite(status) && status >= 500 && status <= 599
}

const SYSTEM_UPDATING_MESSAGE = 'Hệ thống đang cập nhật, vui lòng thử lại sau.'

function resolveAllowMockFallback(): boolean {
  const raw = import.meta.env.VITE_TRENDING_ALLOW_MOCK_FALLBACK
  const s = String(raw ?? '').toLowerCase().trim()
  if (s === 'true' || s === '1') return true
  if (s === 'false' || s === '0') return false
  // mặc định: KHÔNG fallback để tránh “nhìn như có data backend” nhưng thực ra là mock
  return false
}

export function useTrendingDeals() {
  const useApi = resolveUseTrendingApi()
  const allowMockFallback = resolveAllowMockFallback()
  const [deals, setDeals] = useState<TrendingDealDto[] | null>(useApi ? null : [])
  const [meta, setMeta] = useState<TrendingDealsApiMeta | null>(null)
  const [loading, setLoading] = useState(useApi)
  const [error, setError] = useState<string | null>(null)
  const [usingMockFallback, setUsingMockFallback] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect -- khởi tạo/cache trending phức tạp, nhiều nhánh setState có chủ đích */
  useEffect(() => {
    if (!useApi) return

    let cancelled = false

    setError(null)
    setUsingMockFallback(false)

    // 1) Ưu tiên render ngay từ sessionStorage (nếu còn hạn 30 phút)
    const cached = readCacheNow()
    const canUseCache = cached != null && isCacheFresh(cached.savedAtMs)
    if (canUseCache) {
      setDeals(cached.deals)
      setMeta(cached.meta)
      setLoading(false)
    } else {
      // Cache không có / hết hạn -> không hiển thị data cũ
      if (cached != null) clearCacheNow()
      setDeals([])
      setMeta(null)
      setLoading(true)
    }

    // 2) Nếu cache không hợp lệ -> gọi API lấy mới (refresh=true)
    const fetchFresh = async () => {
      const { deals: rows, meta: m, serverStartTime } = await fetchTrendingDeals(
        false,
        { refresh: true },
      )
      if (cancelled) return
      setDeals(rows)
      setMeta(m)
      setError(null)
      setUsingMockFallback(false)
      writeCacheNow({
        savedAtMs: Date.now(),
        serverStartTime,
        meta: m,
        deals: rows,
      })
      setLoading(false)
    }

    if (!canUseCache) {
      fetchFresh().catch((e: unknown) => {
        if (cancelled) return
        const msg =
          e instanceof Error
            ? e.message
            : 'Không thể tải dữ liệu trending từ backend.'
        console.error('[useTrendingDeals] fetchTrendingDeals failed:', e)

        const isServerError = isServerErrorMessage(msg)
        const isNetworkError = isNetworkErrorMessage(msg)

        // 5xx hoặc network error: xoá cache. Dữ liệu cũ có thể đã hết hạn
        // (giá sai, deal đã kết thúc) - không được phép hiển thị cho người dùng.
        if (isServerError || isNetworkError) {
          clearCacheNow()
        }

        if (isServerError) {
          setDeals([])
          setMeta(null)
          setUsingMockFallback(false)
          setError(SYSTEM_UPDATING_MESSAGE)
          setLoading(false)
          return
        }

        setError(msg)
        if (allowMockFallback) {
          setDeals(mockTrendingDealCandidates)
          setMeta(null)
          setUsingMockFallback(true)
        } else {
          setDeals([])
          setMeta(null)
          setUsingMockFallback(false)
        }
        setLoading(false)
      })
    } else {
      // 3) Cache còn hạn: vẫn “dùng ngay”, nhưng kiểm tra backend có chạy lại không.
      // Nếu backend mới hơn cache -> xoá cache và lấy lại data mới.
      // Nếu cache thiếu ảnh (imageUrl/imageUrls rỗng) -> lấy lại data (refresh=false) để đồng bộ ảnh từ backend.
      setLoading(false)
      fetchTrendingDeals(false, { refresh: false })
        .then(({ deals: rows, meta: m, serverStartTime }) => {
          if (cancelled) return
          const latestCache = readCacheNow()
          if (!latestCache) return
          const cachedStart = latestCache.serverStartTime
          if (serverStartTime && cachedStart && serverStartTime !== cachedStart) {
            clearCacheNow()
            setLoading(true)
            return fetchFresh()
          }

          const cacheMissingImages = latestCache.deals.some((d: TrendingDealDto) => {
            const single = d.imageUrl
            const arr = d.imageUrls
            const hasArr =
              Array.isArray(arr) &&
              arr.some((x: unknown) => String(x ?? '').trim().length > 0)
            const hasSingle = typeof single === 'string' && single.trim().length > 0
            return !(hasArr || hasSingle)
          })

          // Backend trả data mới (có thể đã fix imageUrl) => cập nhật state/cache mà không cần refresh=true.
          if (cacheMissingImages && rows && rows.length > 0) {
            setDeals(rows)
            setMeta(m)
            writeCacheNow({
              savedAtMs: Date.now(),
              serverStartTime,
              meta: m,
              deals: rows,
            })
          }
        })
        .catch((e: unknown) => {
          if (cancelled) return
          const msg =
            e instanceof Error
              ? e.message
              : 'Không thể kết nối backend.'
          console.error('[useTrendingDeals] trending validation failed:', e)
          if (isNetworkErrorMessage(msg)) {
            // Backend down: xoá cache để tránh giữ lại dữ liệu cũ đã/đang hết hạn ở lần chạy sau
            clearCacheNow()
            setDeals([])
            setMeta(null)
            setError('Backend không chạy. Không tìm thấy sản phẩm')
            return
          }
          if (isServerErrorMessage(msg)) {
            // Backend 5xx: dữ liệu cache cũ không còn tin cậy (giá/deal có thể đã
            // hết hạn). Xoá sạch và hiển thị thông báo rõ ràng cho người dùng.
            clearCacheNow()
            setDeals([])
            setMeta(null)
            setUsingMockFallback(false)
            setError(SYSTEM_UPDATING_MESSAGE)
          }
        })
    }

    return () => {
      cancelled = true
    }
  }, [useApi, allowMockFallback])
  /* eslint-enable react-hooks/set-state-in-effect */

  return { deals, loading, meta, useApi, error, usingMockFallback }
}
