/** Tên sàn: GIÁ TRỊ phải TRÙNG CHÍNH XÁC với platform.name trong DB (kể cả
 *  hoa/thường), vì API trả về đúng chuỗi này và FE dùng làm key lookup
 *  (PlatformPill style, chart color, so sánh ===).
 *  - DB hiện có: 'Cocolux', 'guardian' (lowercase), 'Hasaki'.
 *  - Để hiển thị chip UI đẹp ("Guardian" capitalized), dùng map label riêng
 *    trong PlatformPill / SearchResultsPage — KHÔNG sửa value ở type này.
 *  - Backend filter lowercase 2 phía nên case-insensitive khi compare, nhưng
 *    value FE vẫn phải giống API để lookup ở client không bị miss.
 */
export type PlatformName =
  | 'Cocolux'
  | 'guardian'
  | 'Hasaki'
  | 'Shopee'
  | 'Lazada'
  | 'Tiki'
  | 'Sendo';

/** Map từ ProductSearchDTO */
export interface Platform {
  platform: string;
  url: string;
  platformImageUrl: string;
  finalPrice: number;
  /** Giá gốc / niêm yết (đã làm tròn khi map từ API trending) */
  originalPrice?: number;
  /** Phần trăm giảm (0–100), làm tròn số nguyên */
  discountPct?: number;
  isOfficial: boolean;
}

export interface ProductSearch {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  subcategory?: string;
  // Backend chỉ trả `imageUrl` (string), `images` có thể không có hoặc rỗng.
  // Để optional để FE buộc phải null-check khi truy cập images[0].
  images?: string[];
  description: string;
  categoryName: string;
  brandName: string;
  score: number;
  imageUrl: string;
  // Có thể undefined khi API lỗi / chưa có dữ liệu.
  platforms: Platform[];
}

// Map từ PriceComparisonResponse
export interface PriceComparison {
  productId: string;
  productName: string;
  imageUrls: string[];
  comparisons: PriceComparisonItem[];
}

export interface PriceComparisonItem {
  platformId: number;
  platformName: string;
  listingId: string;
  url: string;
  platformImageUrl: string;
  price: number;
  originalPrice: number;
  discountPct: number;
  inStock: boolean;
  promotionLabel: string;
  isFlashSale: boolean;
  crawledAt: string;
}

// Map từ PriceHistoryResponse
export interface PriceHistory {
  productId: string;
  platforms: PlatformPriceData[];
}

export interface PlatformPriceData {
  platformId: number;
  platformName: string;
  latestPrice: number;
  averagePrice30Days: number;
  fakePriceIncreaseWarning: boolean;
  prices: PricePoint[];
}

export interface PricePoint {
  crawledAt: string;
  price: number;
}

/** Gợi ý giá (mock / UI chi tiết) */
export interface PriceInsight {
  isLowest30Days?: boolean;
  isLowest90Days: boolean;
  isFakeDiscountRisk: boolean;
  lowerThanAvg30dPercent: number;
  recommendation: 'buy-now' | 'wait' | 'watch';
  summary: string;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
}

export interface PromotionEvent {
  id: string;
  title: string;
  date: string;
  type: string;
}

/** Bản ghi sàn đầy đủ — dùng trong mockProducts */
export interface PlatformPrice {
  platform: string;
  shopName: string;
  isOfficial: boolean;
  currentPrice: number;
  originalPrice: number;
  voucherDiscount: number;
  shippingFee: number;
  finalPrice: number;
  /** Tuỳ chọn — khi có thì ưu tiên hiển thị % giảm */
  discountPct?: number;
  rating: number;
  soldCount: number;
  inStock: boolean;
  lastCrawledAt: string;
  url: string;
}

/** Sản phẩm mock đầy đủ (slug, specs, lịch sử giá, …) */
export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  subcategory?: string;
  images: string[];
  description: string;
  specs: Record<string, string>;
  rating: number;
  reviews: number;
  platforms: PlatformPrice[];
  priceHistory7d: PriceHistoryPoint[];
  priceHistory30d: PriceHistoryPoint[];
  priceHistory90d: PriceHistoryPoint[];
  promotionEvents: PromotionEvent[];
  insight: PriceInsight;
  isWishlisted: boolean;
  relatedProductIds: number[];
}
