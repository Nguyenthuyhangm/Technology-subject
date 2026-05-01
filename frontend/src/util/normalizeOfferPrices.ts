import type { PriceComparison, PriceComparisonItem } from '../types/product';

export type NormalizedOfferPrices = {
    price: number;
    originalPrice: number;
    discountPct: number;
};

/**
 * Chuẩn hóa bộ ba giá: làm tròn price và originalPrice thành số nguyên,
 * tính lại discountPct từ hai giá này (ưu tiên price + originalPrice làm gốc).
 * Đảm bảo khi giá niêm yết bằng giá bán (sau làm tròn) thì discountPct = 0.
 */
export function normalizeOfferPrices(rawPrice: number, rawOriginal: number): NormalizedOfferPrices {
    const price = Math.round(Number(rawPrice));
    const originalPrice = Math.round(Number(rawOriginal));

    const p = Number.isFinite(price) && price >= 0 ? price : 0;
    const o = Number.isFinite(originalPrice) && originalPrice >= 0 ? originalPrice : 0;

    if (o <= 0 && p > 0) {
        return { price: p, originalPrice: p, discountPct: 0 };
    }
    if (p <= 0 && o <= 0) {
        return { price: 0, originalPrice: 0, discountPct: 0 };
    }

    // Dữ liệu gốc < giá bán: giữ nguyên hai giá, không hiển thị phần trăm giảm
    if (o > 0 && o < p) {
        return { price: p, originalPrice: o, discountPct: 0 };
    }

    if (p >= o) {
        return { price: p, originalPrice: o, discountPct: 0 };
    }

    const discountPct = Math.min(100, Math.max(0, Math.round((1 - p / o) * 100)));

    return { price: p, originalPrice: o, discountPct };
}

export function normalizePriceComparisonItem(item: PriceComparisonItem): PriceComparisonItem {
    const n = normalizeOfferPrices(item.price, item.originalPrice);
    return {
        ...item,
        price: n.price,
        originalPrice: n.originalPrice,
        discountPct: n.discountPct,
    };
}

export function normalizePriceComparison(comparison: PriceComparison): PriceComparison {
    return {
        ...comparison,
        comparisons: comparison.comparisons.map(normalizePriceComparisonItem),
    };
}
