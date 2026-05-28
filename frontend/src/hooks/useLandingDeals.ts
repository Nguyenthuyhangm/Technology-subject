import { useMemo } from 'react'
import { useTrendingDeals } from '../util/useTrendingDeals'
import { formatTrendingDealVnd } from '../util/trendingDealFormat'
import type { TrendingDealDto } from '../types/trendingDeal'

export interface LandingDeal {
  id: string
  productId: string
  name: string
  imageUrl: string | null
  priceLabel: string
  oldPriceLabel: string | null
  discountLabel: string | null
  storeName: string
  url: string
}

interface UseLandingDealsOptions {
  limit?: number
  sortBy?: 'discount' | 'score'
}

export interface UseLandingDealsResult {
  deals: LandingDeal[]
  isLoading: boolean
  isError: boolean
  error: string | null
}

function toLandingDeal(d: TrendingDealDto): LandingDeal {
  const current = formatTrendingDealVnd(d.currentPrice)
  const original =
    d.originalPrice != null && d.originalPrice > d.currentPrice
      ? formatTrendingDealVnd(d.originalPrice)
      : null
  const discount =
    d.discountPercent > 0 ? `-${d.discountPercent}%` : null

  return {
    id: d.listingId,
    productId: d.productId,
    name: d.productName,
    imageUrl: d.imageUrl ?? d.imageUrls?.[0] ?? null,
    priceLabel: current,
    oldPriceLabel: original,
    discountLabel: discount,
    storeName: d.platformName,
    url: `/product/${d.productId}`,
  }
}

export function useLandingDeals(options: UseLandingDealsOptions = {}): UseLandingDealsResult {
  const { limit = 10, sortBy = 'discount' } = options
  const { deals, loading, error } = useTrendingDeals()

  const landingDeals = useMemo(() => {
    if (!deals || deals.length === 0) return []

    const sorted = [...deals].sort((a, b) => {
      if (sortBy === 'discount') {
        return (b.discountPercent ?? 0) - (a.discountPercent ?? 0)
      }
      return (b.dealScore ?? 0) - (a.dealScore ?? 0)
    })

    return sorted.slice(0, limit).map((d) => toLandingDeal(d))
  }, [deals, limit, sortBy])

  return {
    deals: landingDeals,
    isLoading: loading,
    isError: !!error,
    error: error,
  }
}
