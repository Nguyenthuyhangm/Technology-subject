import type { PriceComparisonItem, Product, ProductSearch } from './product';

/** Dữ liệu một dòng wishlist hiển thị trên WishlistPage (API + optimistic add) */
export type WishlistDisplayItem = {
  productId: string;
  id?: string;
  name?: string;
  productName?: string;
  brand?: string;
  brandName?: string;
  imageUrl?: string;
  images?: string[];
  minPrice?: number;
  price?: number;
  platformName?: string;
  nearTarget?: boolean;
  priceChanged7dPercent?: number;
};

/** Alias cũ — giữ import hiện có */
export type WishlistItem = WishlistDisplayItem;

/** Cho phép thêm từ Product, ProductSearch, hoặc khối so sánh giá (Product Detail) */
export type WishlistComparisonStub = {
  id: string;
  name: string;
  platforms: PriceComparisonItem[];
};

export type WishlistAddPayload = Product | ProductSearch | WishlistComparisonStub;
