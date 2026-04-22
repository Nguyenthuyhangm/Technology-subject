
export type PlatformName = 'Coculux' | 'Gardian' | 'Hasaki';

export interface Platform {

  platform : string ;
  url : string ;
  platformImageUrl : string ;
  finalPrice : number ;
  isOfficial : boolean ;


// Map từ ProductSearchDTO
}
export interface ProductSearch {
  id: string;           // UUID — mock đang dùng number, cần đổi
  name: string;
  description: string;
  categoryName: string;
  brandName: string;
  score: number;
  imageUrl: string;
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
export type Product = {
  id: string;
  name: string;
  images: string[];
  brand: string;
  category: string;
  platforms: any[];
};