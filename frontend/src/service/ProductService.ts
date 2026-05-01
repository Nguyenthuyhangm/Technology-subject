import type { ProductSearch, PriceComparison, PriceHistory } from '../types/product';

const BASE_URL = 'http://localhost:8080';

export interface SearchProductsOptions {
    /**
     * Danh sách platform muốn lọc (ví dụ ['Hasaki', 'Cocolux']).
     * - undefined / rỗng -> không filter platform
     * - Backend nhận ?platform=X&platform=Y
     */
    platforms?: string[];

    /**
     * Danh mục muốn lọc.
     * - 'all' / undefined -> không filter category
     */
    categoryId?: string;

    /**
     * Loại khuyến mãi muốn lọc.
     * - 'all' / undefined -> không filter promo
     */
    promo?: string;
}

/**
 * Search sản phẩm theo keyword + platform + category + promo.
 *
 * Giữ tương thích:
 * - platform multi-select -> append nhiều lần key `platform`
 * - categoryId / promo chỉ gửi khi khác 'all'
 */
export async function searchProducts(
    query: string,
    opts: SearchProductsOptions = {},
): Promise<ProductSearch[]> {
    const params = new URLSearchParams();
    params.set('q', query);

    const platforms = (opts.platforms ?? [])
        .map((p) => p?.trim())
        .filter((p): p is string => !!p && p.length > 0);

    for (const p of platforms) {
        params.append('platform', p);
    }

    const categoryId = opts.categoryId?.trim();
    if (categoryId && categoryId !== 'all') {
        params.set('categoryId', categoryId);
    }

    const promo = opts.promo?.trim();
    if (promo && promo !== 'all') {
        params.set('promo', promo);
    }

    const res = await fetch(`${BASE_URL}/products/search?${params.toString()}`);
    if (!res.ok) throw new Error('API error');
    return res.json();
}

// Compare -> GET /api/compare/{productId}
export async function priceComparison(productId: string): Promise<PriceComparison> {
    const res = await fetch(`${BASE_URL}/api/compare/${productId}`);
    if (!res.ok) throw new Error('API error');
    return res.json();
}

// History -> GET /api/v1/price-history/{productId}
export async function priceHistory(productId: string): Promise<PriceHistory> {
    const res = await fetch(`${BASE_URL}/api/v1/price-history/${productId}`);
    if (!res.ok) throw new Error('API error');
    return res.json();
}

// Bổ sung: Lấy sản phẩm theo danh mục
// Category -> GET /products/category/{slug}
export async function getProductsByCategory(slug: string): Promise<ProductSearch[]> {
    const res = await fetch(`${BASE_URL}/products/category/${encodeURIComponent(slug)}`);
    if (!res.ok) {
        throw new Error('API error: Không thể lấy sản phẩm của danh mục này');
    }
    return res.json();
}