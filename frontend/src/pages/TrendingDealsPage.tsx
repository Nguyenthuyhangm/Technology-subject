import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { TrendingDealRow } from '../components/deals/TrendingDealRow'
import AppHeader from '../components/layout/AppHeader'
import { TRENDING_DEAL_FONT_STACK } from '../util/trendingDealFormat'
import { useTrendingDeals } from '../util/useTrendingDeals'

const PAGE_SIZE = 5

export default function TrendingDealsPage() {
  const { deals, loading, error } = useTrendingDeals()
  const [brokenListingIds, setBrokenListingIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [params, setParams] = useSearchParams()
  const pageRaw = Number(params.get('page') ?? '1')
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1

  const sorted = useMemo(() => {
    const arr = [...(deals ?? [])]
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
  }, [deals, brokenListingIds])

  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const pageRows = sorted.slice(start, start + PAGE_SIZE)

  const goToPage = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages)
    setParams({ page: String(next) })
  }

  return (
    <div
      className="min-h-screen bg-[#FCF8F4] text-stone-900"
      style={{ fontFamily: TRENDING_DEAL_FONT_STACK.sans }}
    >
      <AppHeader currentPage="deals" />

      <main className="mx-auto max-w-7xl px-6 pb-20 pt-36 lg:px-12">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8E6A72]">
              Trending
            </p>
            <h1
              className="mt-2 text-4xl tracking-[-0.02em] text-stone-900 md:text-5xl"
              style={{ fontFamily: TRENDING_DEAL_FONT_STACK.serif }}
            >
              Trending deals
            </h1>
          </div>

          <Link
            to="/deals"
            className="inline-flex items-center gap-2 text-sm text-stone-500 transition hover:text-stone-900"
          >
            Quay lại trang Deals
          </Link>
        </div>

        {loading && total === 0 && (
          <p className="mt-6 flex items-center gap-2 text-sm text-stone-500">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            <span>Đang tải </span>
          </p>
        )}

        {!loading && total === 0 && error && (
          <p className="mt-6 text-sm text-stone-500">
            Không tìm thấy sản phẩm phù hợp
          </p>
        )}

        {!loading && total === 0 && !error && (
          <p className="mt-6 text-sm text-stone-500">
            Không tìm thấy sản phẩm phù hợp
          </p>
        )}

        {total > 0 && (
          <>
            <ul className="mt-6 space-y-6">
              {pageRows.map((d, i) => (
                <li key={d.listingId} className="space-y-2">
                  <p className="pl-2 text-xs font-medium text-stone-400">
                    #{start + i + 1}
                  </p>
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

            <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-2 rounded-full border border-stone-200/90 bg-white/90 px-4 py-2 text-xs font-medium text-stone-600 transition hover:border-[#C9A9B0] hover:bg-[#FCF8F4] hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Trước
              </button>

              <p className="text-xs text-stone-500">
                Trang <span className="font-medium text-stone-700">{safePage}</span>{' '}
                / {totalPages} · {total} sản phẩm
              </p>

              <button
                type="button"
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-2 rounded-full border border-stone-200/90 bg-white/90 px-4 py-2 text-xs font-medium text-stone-600 transition hover:border-[#C9A9B0] hover:bg-[#FCF8F4] hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

