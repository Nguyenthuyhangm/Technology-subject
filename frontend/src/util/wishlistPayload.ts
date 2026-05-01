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

function isPriceComparisonRow(
  row:
    | Product['platforms'][number]
    | PriceComparisonItem
    | ProductSearch['platforms'][number],
): row is PriceComparisonItem {
  return 'listingId' in row && typeof (row as PriceComparisonItem).listingId === 'string';
}

function isWishlistComparisonStubPayload(
  p: WishlistAddPayload,
): p is WishlistComparisonStub {
  if ('specs' in p && p.specs) return false;
  if (!p.platforms.length) return false;
  return isPriceComparisonRow(p.platforms[0]);
}

export function wishlistDisplayFromPayload(payload: WishlistAddPayload): WishlistDisplayItem {
  const productId = String(payload.id);

  if ('specs' in payload && payload.specs) {
    const prod = payload as Product;
    const best = [...prod.platforms].sort((a, b) => a.finalPrice - b.finalPrice)[0];
    return {
      productId,
      id: prod.id,
      name: prod.name,
      productName: prod.name,
      images: prod.images,
      imageUrl: prod.images[0],
      brandName: prod.brand,
      minPrice: best?.finalPrice,
      platformName: best?.platform,
      nearTarget: prod.insight?.isLowest30Days ?? false,
      priceChanged7dPercent: prod.insight?.lowerThanAvg30dPercent ?? 0,
    };
  }

  if (isWishlistComparisonStubPayload(payload)) {
    const stub = payload;
    const best = [...stub.platforms].sort((a, b) => a.price - b.price)[0];
    return {
      productId,
      id: stub.id,
      name: stub.name,
      productName: stub.name,
      minPrice: best?.price,
      platformName: best?.platformName,
      images: [],
      nearTarget: false,
      priceChanged7dPercent: 0,
    };
  }

  const ps = payload as ProductSearch;
  const best = [...ps.platforms].sort((a, b) => a.finalPrice - b.finalPrice)[0];
  return {
    productId,
    id: ps.id,
    name: ps.name,
    productName: ps.name,
    images: ps.images,
    imageUrl: ps.imageUrl,
    brandName: ps.brandName,
    minPrice: best?.finalPrice,
    platformName: best?.platform,
    nearTarget: false,
    priceChanged7dPercent: 0,
  };
}
