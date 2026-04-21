

// ================== SLUG ==================
export function slugify(text: string): string {
    if (!text) return '';

    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^0-9a-z\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}
// ================== CATEGORY ==================
export function extractCategory(product: any): string | null {
    // Ưu tiên breadcrumb (cocolux)
    if (product.breadcrumb && product.breadcrumb.length > 1) {
        return product.breadcrumb[product.breadcrumb.length - 1];
    }

    // ===== fallback theo URL =====
    if (!product.url) return null;

    const url = product.url.toLowerCase();

    // ===== CHĂM SÓC DA MẶT =====
    if (url.includes('serum-tinh-chat') || url.includes('serum')) return 'Serum';
    if (url.includes('kem-gel-xit-duong-da') || url.includes('kem-duong')) return 'Kem dưỡng';
    if (url.includes('sua-rua-mat') || url.includes('cleanser')) return 'Sữa rửa mặt';
    if (url.includes('tay-trang')) return 'Tẩy trang';
    if (url.includes('toner') || url.includes('nuoc-hoa-hong')) return 'Toner';
    if (url.includes('mat-na')) return 'Mặt nạ';
    if (url.includes('chong-nang')) return 'Kem chống nắng';
    if (url.includes('tay-te-bao-chet-da-mat') || url.includes('scrub')) return 'Tẩy da chết';
    if (url.includes('cham-soc-da-vung-mat')) return 'Kem mắt';

    // ===== TRANG ĐIỂM =====
    if (url.includes('son')) return 'Son môi';
    if (url.includes('phan-mat')) return 'Phấn mắt';
    if (url.includes('mascara')) return 'Mascara';
    if (url.includes('eyeliner') || url.includes('ke-mat')) return 'Kẻ mắt';
    if (url.includes('phan-nen') || url.includes('foundation')) return 'Kem nền';
    if (url.includes('cushion')) return 'Cushion';
    if (url.includes('ma-hong')) return 'Má hồng';

    // ===== CHĂM SÓC CƠ THỂ =====
    if (url.includes('sua-tam') || url.includes('xa-phong')) return 'Sữa tắm';
    if (url.includes('duong-da-co-the') || url.includes('body-lotion')) return 'Dưỡng thể';
    if (url.includes('khu-mui')) return 'Khử mùi';
    if (url.includes('tay-te-bao-chet-co-the')) return 'Tẩy da chết body';
    if (url.includes('nuoc-rua-tay')) return 'Nước rửa tay';

    // ===== CHĂM SÓC TÓC =====
    if (url.includes('dau-goi')) return 'Dầu gội';
    if (url.includes('dau-xa')) return 'Dầu xả';
    if (url.includes('duong-toc')) return 'Dưỡng tóc';
    if (url.includes('tao-kieu-toc')) return 'Tạo kiểu tóc';
    if (url.includes('nhuom-toc')) return 'Nhuộm tóc';

    // ===== CÁ NHÂN =====
    if (url.includes('kem-danh-rang')) return 'Kem đánh răng';
    if (url.includes('ban-chai')) return 'Bàn chải';
    if (url.includes('nuoc-suc-mieng')) return 'Nước súc miệng';
    if (url.includes('nuoc-hoa')) return 'Nước hoa';

    // ===== SỨC KHỎE =====
    if (url.includes('thuc-pham-chuc-nang')) return 'Thực phẩm chức năng';
    if (url.includes('bao-cao-su')) return 'Bao cao su';
    if (url.includes('thiet-bi-y-te')) return 'Thiết bị y tế';

    // ===== MẸ & BÉ =====
    if (url.includes('ta-khan-uot')) return 'Khăn ướt';
    if (url.includes('tam-goi-cho-be')) return 'Tắm gội cho bé';

    return 'sản phẩm khác';
}
// ================== SIZE ==================
export function extractSizeTag(name: string): string | null {
    if (!name) return null;

    const n = name.toLowerCase();

    // chuẩn hóa: 30G → 30g
    const normalized = n.replace(/g\b/g, 'g').replace(/ml\b/g, 'ml');

    // case: 30g x 2 / 2x30g
    const multi1 = normalized.match(/(\d+)\s*(ml|g)\s*[x×*]\s*(\d+)/);
    if (multi1) return `${multi1[1]}${multi1[2]}`;

    const multi2 = normalized.match(/(\d+)\s*[x×*]\s*(\d+)\s*(ml|g)/);
    if (multi2) return `${multi2[2]}${multi2[3]}`;

    // standard
    const match = normalized.match(/(\d+(\.\d+)?)\s*(ml|g|kg|l)/);
    if (match) return `${match[1]}${match[3]}`;

    return null;
}

// ================== CLEAN TEXT ==================
export function cleanTextForAI(name: string): string {
    if (!name) return '';

    return name
        .toLowerCase()

        // bỏ dấu tiếng Việt
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')

        // bỏ noise cực quan trọng
        .replace(/combo\s*\d+/g, '')
        .replace(/minisize|mini size|sample|trial|travel size/gi, '')
        .replace(/chinh hang|authentic|auth|new|sale|hot/gi, '')

        // bỏ size (AI không cần)
        .replace(/\d+(\.\d+)?\s*(ml|g|kg|l)/g, '')

        // bỏ ký tự đặc biệt
        .replace(/[^a-z0-9\s]/g, '')

        // normalize space
        .replace(/\s+/g, ' ')
        .trim();
}

// ================== MAIN ==================

import fs from 'fs';
function run() {
    const raw = fs.readFileSync('../storage/raw.json', 'utf-8');
    const data = JSON.parse(raw);

    const normalized = data.map((p: any) => {
        return {
            name: p.name,

            // 🔥 QUAN TRỌNG
            brandName: p.brand,

            slug: slugify(p.name),
            categoryName: extractCategory(p),

            sizeTag: extractSizeTag(p.name),
            cleanName: cleanTextForAI(p.name),

            price: p.price,
            originalPrice: p.original_price,

            inStock: p.in_stock,
            rating: p.rating,

            url: p.url,
            imageUrl: p.image_url,

            description: p.description || null,
            benefits: p.benefits || null,
            usage: p.usage || null,
            ingredients: p.ingredients || null
        };
    });
    fs.writeFileSync(
        '../storage/nomalized.json',
        JSON.stringify(normalized, null, 2),
        'utf-8'
    );

    console.log(`✅ Done: ${normalized.length} products`);
}


// ================== RUN FILE ==================
if (require.main === module) {
    run();
}