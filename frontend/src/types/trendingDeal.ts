/** Meta AC-07 từ header HTTP (Spring Boot) */
export type TrendingDealsApiMeta = {
  computedAt: string
  nextRefreshAfter: string
  cacheTtlSeconds: number
}

/** Khớp JSON từ GET /api/trending-deals (Spring Boot + Jackson) */
export type TrendingDealDto = {
  listingId: string
  productId: string
  /** Nhóm canonical + biến thể (vd model); dùng để giới hạn 1 listing đại diện / nhóm */
  variantKey?: string
  productName: string
  /**
   * Ảnh đại diện (thường là URL string). Một số backend có thể trả `imageUrls` dạng mảng;
   * phía UI sẽ ưu tiên lấy `imageUrls[0]` nếu có, tương tự ProductDetailPage.
   */
  imageUrl: string | null
  imageUrls?: string[] | null
  platformName: string
  /** Giá niêm yết tốt nhất (đã gồm voucher & phí ship) — khớp ProductSummary */
  currentPrice: number
  originalPrice: number | null
  discountPercent: number
  isFlashSale?: boolean
  dealScore: number
  badge: string
  explanation: string
  pinned: boolean
  /** Thành phần điểm 0–1, từ ScoreCalculator khi backend bật đủ trường */
  discountScore?: number
  trustScore?: number
  freshnessScore?: number
}
