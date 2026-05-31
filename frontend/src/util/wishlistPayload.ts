import type {
  PriceComparisonItem,
  Product,
  ProductSearch,
} from '../types/product';
import type {
  WishlistAddPayload,
  WishlistComparisonStub,
  WishlistDisplayItem,
} from '../types/wishlist';

function isProductSearch(p: WishlistAddPayload): p is ProductSearch {
  return 'bestPrice' in p && 'bestPlatform' in p;
}

function isProduct(p: WishlistAddPayload): p is Product {
  return 'specs' in p && !!(p as Product).specs;
}

function isPriceComparisonRow(
  row: unknown,
): row is PriceComparisonItem {
  return typeof row === 'object' && row !== null && 'listingId' in row;
}

function isWishlistComparisonStub(p: WishlistAddPayload): p is WishlistComparisonStub {
  if (isProduct(p) || isProductSearch(p)) return false;
  const platforms = (p as any).platforms;
  return Array.isArray(platforms) && platforms.length > 0 && isPriceComparisonRow(platforms[0]);
}

export function wishlistDisplayFromPayload(payload: WishlistAddPayload): WishlistDisplayItem {
  const productId = String(payload.id);

  // ProductSearch (từ search results) — không có platforms
  if (isProductSearch(payload)) {
    return {
      productId,
      id: payload.id,
      name: payload.name,
      productName: payload.name,
      imageUrl: payload.imageUrl,
      brandName: payload.brandName,
      minPrice: payload.bestPrice,
      platformName: payload.bestPlatform,
      nearTarget: false,
      priceChanged7dPercent: 0,
    };
  }

  // Product đầy đủ (từ mock/detail)
  if (isProduct(payload)) {
    const best = [...payload.platforms].sort((a, b) => a.finalPrice - b.finalPrice)[0];
    return {
      productId,
      id: payload.id,
      name: payload.name,
      productName: payload.name,
      images: payload.images,
      imageUrl: payload.images?.[0],
      brandName: payload.brand,
      minPrice: best?.finalPrice,
      platformName: best?.platform,
      nearTarget: payload.insight?.isLowest30Days ?? false,
      priceChanged7dPercent: payload.insight?.lowerThanAvg30dPercent ?? 0,
    };
  }

  // WishlistComparisonStub (từ product detail page)
  if (isWishlistComparisonStub(payload)) {
    const best = [...payload.platforms].sort((a, b) => a.price - b.price)[0];
    return {
      productId,
      id: payload.id,
      name: payload.name,
      productName: payload.name,
      minPrice: best?.price,
      platformName: best?.platformName,
      images: [],
      nearTarget: false,
      priceChanged7dPercent: 0,
    };
  }

  // Fallback
  const anyPayload = payload as any;
return { productId, id: String(anyPayload.id), name: anyPayload.name ?? '' };
}