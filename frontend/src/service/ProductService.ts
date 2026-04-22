import type {ProductSearch,PriceComparison,PriceHistory} from '../types/product' ;

const BASE_URL = 'http://localhost:8080';

// Search → GET /products/search?q=...
export async function searchProducts(query: string): Promise<ProductSearch[]> {
    const res = await fetch(`${BASE_URL}/products/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("API error");
    return res.json();
}

// Sửa hàm priceComparison
export async function priceComparison(productId: string): Promise<PriceComparison> {
    // Sửa từ ?productId=... thành /...
    const res = await fetch(`${BASE_URL}/api/compare/${productId}`);
    if (!res.ok) throw new Error("API error");
    return res.json();
}

// Sửa hàm priceHistory
export async function priceHistory(productId: string): Promise<PriceHistory> {
    // Sửa từ ?productId=... thành /...
    const res = await fetch(`${BASE_URL}/api/v1/price-history/${productId}`);
    if (!res.ok) throw new Error("API error");
    return res.json();
}