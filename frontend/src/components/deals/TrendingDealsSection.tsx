import { useMemo, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  TRENDING_DEAL_DISCLAIMER,
  TRENDING_DEAL_FONT_STACK,
} from '../../util/trendingDealFormat'
import { useTrendingDeals } from '../../util/useTrendingDeals'
import { TrendingDealRow } from './TrendingDealRow'

export default function TrendingDealsSection() {
  const { deals, loading, error } = useTrendingDeals()
  const [brokenListingIds, setBrokenListingIds] = useState<Set<string>>(
    () => new Set(),
  )

  const list = useMemo(() => deals ?? [], [deals])
  const sorted = useMemo(() => {
    const arr = [...list]
    arr.sort((a, b) => {
      const dd = (b.discountPercent ?? 0) - (a.discountPercent ?? 0)
      if (Math.abs(dd) > 1e-9) return dd

      const fs = (b.isFlashSale ? 1 : 0) - (a.isFlashSale ? 1 : 0)
      if (fs !== 0) return fs

      const ds = (b.dealScore ?? 0) - (a.dealScore ?? 0)
      if (Math.abs(ds) > 1e-9) return ds

      // Nếu cùng dealScore: ưu tiên sản phẩm không lỗi hình ảnh.
      const ab = brokenListingIds.has(a.listingId) ? 1 : 0
      const bb = brokenListingIds.has(b.listingId) ? 1 : 0
      if (ab !== bb) return ab - bb

      // Nếu chưa biết load lỗi: ưu tiên có imageUrl (không rỗng)
      const ah = a.imageUrl && String(a.imageUrl).trim().length > 0 ? 1 : 0
      const bh = b.imageUrl && String(b.imageUrl).trim().length > 0 ? 1 : 0
      if (ah !== bh) return bh - ah

      return String(a.productId).localeCompare(String(b.productId))
    })
    return arr
  }, [list, brokenListingIds])

  const visible = sorted.slice(0, 5)

  return (
    <section
      className="mb-14 rounded-[34px] border border-[#DDD2C6] bg-white/90 p-8 shadow-[0_14px_35px_rgba(15,23,42,0.05)]"
      style={{ fontFamily: TRENDING_DEAL_FONT_STACK.sans }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full min-w-0">
          <h2
            className="text-2xl text-stone-900 md:text-3xl"
            style={{ fontFamily: TRENDING_DEAL_FONT_STACK.serif }}
          >
            Trending deals
          </h2>
          <p className="mt-3 text-balance text-xs leading-relaxed text-stone-500 sm:text-sm">
            {TRENDING_DEAL_DISCLAIMER}
          </p>
        </div>
      </div>

      {loading && list.length === 0 && (
        <p className="mt-8 flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          <span>Đang tải </span>
        </p>
      )}

      {!loading && list.length === 0 && error && (
        <p className="mt-8 text-sm text-stone-500">
          Không tìm thấy sản phẩm phù hợp
        </p>
      )}

      {!loading && list.length > 0 && (
        <ul className="mt-8 space-y-6">
          {visible.map((d) => (
            <li key={d.listingId}>
              <TrendingDealRow
                d={d}
                onImageError={(listingId) => {
                  setBrokenListingIds((prev) => {
                    if (prev.has(listingId)) return prev
                    const next = new Set(prev)
                    next.add(listingId)
                    return next
                  })
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {!loading && list.length === 0 && !error && (
        <p className="mt-8 text-sm text-stone-500">
          Không tìm thấy sản phẩm phù hợp
        </p>
      )}

      {!loading && sorted.length > 5 && (
        <div className="mt-8 flex justify-center">
          <Link
            to="/trending-deals?page=1"
            className="inline-flex items-center gap-2 rounded-full border border-stone-200/90 bg-white/90 px-5 py-2.5 text-xs font-medium text-stone-600 transition hover:border-[#C9A9B0] hover:bg-[#FCF8F4] hover:text-stone-900"
          >
            Xem thêm
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </section>
  )
}
