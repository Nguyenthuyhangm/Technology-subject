import type {ProductSearch, PriceComparison, PriceHistory} from '../types/product';

const BASE_URL = 'http://localhost:8080';

// Search → GET /products/search?q=...
export async function searchProducts(query: string): Promise<ProductSearch[]> {
    const res = await fetch(`${BASE_URL}/products/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("API error");
    return res.json();
}

// Compare → GET /api/compare/{productId}
export async function priceComparison(productId: string): Promise<PriceComparison> {
    const res = await fetch(`${BASE_URL}/api/compare/${productId}`);
    if (!res.ok) throw new Error("API error");
    return res.json();
}

// History → GET /api/v1/price-history/{productId}
export async function priceHistory(productId: string): Promise<PriceHistory> {
    const res = await fetch(`${BASE_URL}/api/v1/price-history/${productId}`);
    if (!res.ok) throw new Error("API error");
    return res.json();
}

// BỔ SUNG: Lấy sản phẩm theo danh mục
// Category → GET /products/category/{slug}
export async function getProductsByCategory(slug: string): Promise<ProductSearch[]> {
    // Gọi API bằng fetch tương tự như hàm search
    const res = await fetch(`${BASE_URL}/products/category/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error("API error: Không thể lấy sản phẩm của danh mục này");
    return res.json();
}