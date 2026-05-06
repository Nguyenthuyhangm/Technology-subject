const axios = require('axios');
const fs = require('fs');

const brands = [
    "Acnes", "La Roche-Posay", "The Cocoon Original Vietnam", "Hada Labo", 
    "Selsun", "Nivea", "Sunplay", "Head & Shoulders", "OXY", "Lifebuoy", 
    "Melano CC", "LipIce", "TSUBAKI", "Enchanteur", "L'ORÉAL"
];

const FILE_PATH = 'tiki_full_data.json';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Cấu hình Axios (Giữ nguyên Token/Cookie từ cURL của bạn)
const GUEST_TOKEN = 'sDHYqRdX9iAOFM12a6gkjfQhlr5JmKuN';
const TRACKITY_ID = 'd70817f6-4961-b98e-f68d-7fd489ed1162';
const COOKIE = `_trackity=${TRACKITY_ID}; TOKENS={%22access_token%22:%22${GUEST_TOKEN}%22%2C%22guest_token%22:%22${GUEST_TOKEN}%22}; delivery_zone=Vk4wMzQwMjQwMTM=;`;

const axiosInstance = axios.create({
    headers: {
        'accept': 'application/json, text/plain, */*',
        'cookie': COOKIE,
        'referer': 'https://tiki.vn/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
        'x-guest-token': GUEST_TOKEN
    }
});

function loadExistingData() {
    if (fs.existsSync(FILE_PATH)) {
        try {
            return JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
        } catch (e) { return []; }
    }
    return [];
}

async function getProductDescription(productId) {
    try {
        const res = await axiosInstance.get(`https://tiki.vn/api/v2/products/${productId}`);
        return res.data.description ? res.data.description.replace(/<[^>]*>?/gm, '').trim() : "Không có mô tả";
    } catch (e) { return "Lỗi lấy mô tả"; }
}

async function getProductReviews(productId) {
    try {
        const res = await axiosInstance.get(`https://tiki.vn/api/v3/reviews?product_id=${productId}&limit=5&sort=newest`);
        return res.data?.data ? res.data.data.map(rev => ({
            customer: rev.created_by.full_name,
            content: rev.content,
            rating: rev.rating
        })) : [];
    } catch (e) { return []; }
}

async function crawlTikiFinal() {
    let allData = loadExistingData();
    const existingIds = new Set();
    allData.forEach(brandNode => brandNode.items.forEach(item => existingIds.add(item.id)));

    for (let brand of brands) {
        console.log(`\n📦 Hãng: ${brand}`);
        let brandNode = allData.find(b => b.brand === brand);
        if (!brandNode) {
            brandNode = { brand: brand, items: [] };
            allData.push(brandNode);
        }

        try {
            const response = await axiosInstance.get('https://tiki.vn/api/v2/products', {
                params: { limit: 40, is_mweb: 1, brand: brand, page: 1 }
            });

            const products = response.data.data;
            if (products && products.length > 0) {
                for (let p of products) {
                    if (existingIds.has(p.id)) {
                        console.log(`   ⏭️ Bỏ qua: ${p.name.substring(0, 35)}...`);
                        continue;
                    }

                    console.log(`   🚀 Cào mới: ${p.name.substring(0, 35)}...`);
                    const [desc, reviews] = await Promise.all([
                        getProductDescription(p.id),
                        getProductReviews(p.id)
                    ]);

                    const newItem = {
                        id: p.id,
                        name: p.name,
                        price: p.price,
                        original_price: p.original_price,
                        discount_rate: p.discount_rate, // Thêm % giảm giá
                        quantity_sold: p.all_time_quantity_sold?.value || 0, // SỐ LƯỢNG ĐÃ BÁN
                        thumbnail: p.thumbnail_url,
                        url: `https://tiki.vn/${p.url_path}`,
                        rating: p.rating_average,
                        description: desc,
                        reviews: reviews,
                        crawled_at: new Date().toISOString()
                    };

                    brandNode.items.push(newItem);
                    existingIds.add(p.id);

                    // Ghi file ngay lập tức để bảo toàn dữ liệu
                    fs.writeFileSync(FILE_PATH, JSON.stringify(allData, null, 2), 'utf-8');
                    await delay(1200); 
                }
            }
        } catch (error) {
            console.error(`❌ Lỗi hãng ${brand}: ${error.message}`);
        }
        await delay(3000);
    }
    console.log('\n✨ HOÀN TẤT CẬP NHẬT DỮ LIỆU TIKI!');
}

crawlTikiFinal();