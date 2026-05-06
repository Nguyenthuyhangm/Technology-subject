import type { ProductSearch, PriceComparison, PriceHistory } from '../types/product';

const BASE_URL = 'http://localhost:8080';

export interface SearchProductsOptions {
    /**
     * Danh sách platform muốn lọc (ví dụ ['Hasaki','Cocolux']).
     * - `undefined` / rỗng  → không filter platform (giữ logic cũ).
     * - Backend nhận `?platform=X&platform=Y` (case-insensitive).
     */
    platforms?: string[];
}

/**
 * Search sản phẩm theo keyword + platform động.
 *
 * Cách đồng bộ state giữa UI và API call:
 *  - Caller truyền mảng `platforms` đang được chọn ở UI (Set → Array sorted).
 *  - Hook/page nên key useEffect bằng `[query, platformsKey]` trong đó
 *    `platformsKey = platforms.sort().join(',')` để re-fetch khi user
 *    tick/untick, nhưng không re-fetch thừa khi mảng cùng nội dung.
 */
export async function searchProducts(
    query: string,
    opts: SearchProductsOptions = {},
): Promise<ProductSearch[]> {
    const params = new URLSearchParams();
    params.set('q', query);

    // Multi-select platforms: append nhiều lần cùng key `platform`.
    // Backend đọc `@RequestParam List<String> platform` → nhận đủ list.
    const platforms = (opts.platforms ?? [])
        .map((p) => p?.trim())
        .filter((p): p is string => !!p && p.length > 0);
    for (const p of platforms) {
        params.append('platform', p);
    }

    const res = await fetch(`${BASE_URL}/products/search?${params.toString()}`);
    if (!res.ok) throw new Error('API error');
    return res.json();
}

export async function priceComparison(productId: string): Promise<PriceComparison> {
    const res = await fetch(`${BASE_URL}/api/compare/${productId}`);
    if (!res.ok) throw new Error('API error');
    return res.json();
}

export async function priceHistory(productId: string): Promise<PriceHistory> {
    const res = await fetch(`${BASE_URL}/api/v1/price-history/${productId}`);
    if (!res.ok) throw new Error('API error');
    return res.json();
}
