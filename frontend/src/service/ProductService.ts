import type {ProductSearch, PriceComparison, PriceHistory} from '../types/product';

const BASE_URL = 'http://localhost:8080';

// 🔥 SỬA CHỖ NÀY: Thêm categorySlug và promo để đồng bộ với Frontend và Backend
// Search → GET /products/search?q=...&categoryId=...&promo=...
export async function searchProducts(query: string, categorySlug: string = 'all', promo: string = 'all'): Promise<ProductSearch[]> {
    let url = `${BASE_URL}/products/search?q=${encodeURIComponent(query)}`;
    
    // Nếu có chọn danh mục khác "Tất cả", nối thêm vào URL
    if (categorySlug !== 'all') {
        url += `&categoryId=${encodeURIComponent(categorySlug)}`;
    }
    
    // Nếu có chọn khuyến mãi khác "Tất cả", nối thêm vào URL
    if (promo !== 'all') {
        url += `&promo=${encodeURIComponent(promo)}`;
    }

    const res = await fetch(url);
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