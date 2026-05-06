const puppeteer = require('puppeteer');
const fs = require('fs');

// Danh sách các URL thương hiệu cần crawl
const brandUrls = [
    'https://hasaki.vn/thuong-hieu/acnes.html',
    'https://hasaki.vn/thuong-hieu/la-roche-posay.html',
    'https://hasaki.vn/thuong-hieu/cocoon.html',
    'https://hasaki.vn/thuong-hieu/hada-labo.html',
    'https://hasaki.vn/thuong-hieu/selsun.html',
    'https://hasaki.vn/thuong-hieu/nivea.html',
    'https://hasaki.vn/thuong-hieu/sunplay.html',
    'https://hasaki.vn/thuong-hieu/head-shoulders.html',
    'https://hasaki.vn/thuong-hieu/oxy.html',
    'https://hasaki.vn/thuong-hieu/lifebuoy.html',
    'https://hasaki.vn/thuong-hieu/melano-cc.html',
    'https://hasaki.vn/thuong-hieu/lipice.html',
    'https://hasaki.vn/thuong-hieu/tsubaki.html',
    'https://hasaki.vn/thuong-hieu/enchanteur.html',
    'https://hasaki.vn/thuong-hieu/l-oreal.html'
];

(async () => {
    // Khởi tạo trình duyệt
    const browser = await puppeteer.launch({ 
        headless: "new", // Chạy ngầm, không mở UI trình duyệt
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    // Đặt User-Agent để tránh bị block như bot
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    // Set viewport lớn để đảm bảo load đủ các item trong grid
    await page.setViewport({ width: 1920, height: 1080 });

    let allExtractedProducts = [];

    for (const url of brandUrls) {
        console.log(`\n⏳ Đang tiến hành crawl: ${url}`);
        
        try {
            // Chờ cho đến khi không còn request mạng nào quá 2 giây (đảm bảo trang đã load xong)
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Tùy chọn: Scroll từ từ xuống cuối trang để kích hoạt lazy-load hình ảnh
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= scrollHeight - window.innerHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });

            // Tiến hành bóc tách dữ liệu
            const products = await page.evaluate(() => {
                const results = [];
                // LƯU Ý: Các class selector dưới đây là giả định cấu trúc phổ biến của Hasaki. 
                // Bạn có thể cần Inspect (F12) trên trang Hasaki để cập nhật lại class nếu họ thay đổi giao diện.
                const productNodes = document.querySelectorAll('.ProductGridItem__itemOuter, .sp-item'); // Cập nhật class container sản phẩm ở đây

                productNodes.forEach(node => {
                    try {
                        // Lấy Tên
                        const nameEl = node.querySelector('.vn_names, .product-name');
                        const name = nameEl ? nameEl.innerText.trim() : '';

                        // Lấy Giá hiện tại (bỏ ký tự 'đ' và dấu phẩy để dễ lưu DB)
                        const priceEl = node.querySelector('.txt_price, .price-now');
                        const priceStr = priceEl ? priceEl.innerText.replace(/[^0-9]/g, '') : '0';
                        const price = parseInt(priceStr);

                        // Lấy Giá gốc
                        const originalPriceEl = node.querySelector('.txt_price_old, .price-old');
                        const originalPriceStr = originalPriceEl ? originalPriceEl.innerText.replace(/[^0-9]/g, '') : priceStr;
                        const original_price = parseInt(originalPriceStr) || price;

                        // Lấy URL và Thumbnail
                        const linkEl = node.querySelector('a');
                        const url = linkEl ? linkEl.href : '';
                        
                        const imgEl = node.querySelector('img');
                        // Ưu tiên data-src nếu dùng lazy-load, nếu không có thì lấy src
                        const thumbnail = imgEl ? (imgEl.getAttribute('data-src') || imgEl.src) : '';

                        // Lấy Mô tả ngắn (nếu có hiển thị ở ngoài list)
                        const descEl = node.querySelector('.product-description, .short-desc');
                        const desc = descEl ? descEl.innerText.trim() : '';

                        // Lấy Rating (Đếm số sao hoặc lấy text hiển thị đánh giá)
                        const ratingEl = node.querySelector('.rating-score, .star-rating');
                        const ratingStr = ratingEl ? ratingEl.innerText.trim() : '0';
                        const rating = parseFloat(ratingStr) || 0;

                        if (name && url) {
                            results.push({
                                name: name,
                                price: price,
                                original_price: original_price,
                                thumbnail: thumbnail,
                                url: url,
                                description: desc,
                                rating: rating,
                            });
                        }
                    } catch (err) {
                        // Bỏ qua lỗi lẻ tẻ của 1 DOM element để không dừng toàn bộ tiến trình
                    }
                });
                return results;
            });

            // Map lại mảng kết quả và thêm trường crawled_at như bạn yêu cầu
            const formattedProducts = products.map(p => ({
                name: p.name,
                price: p.price,
                original_price: p.original_price,
                thumbnail: p.thumbnail,
                url: p.url,
                description: p.description,
                rating: p.rating,
                crawled_at: new Date().toISOString()
            }));

            allExtractedProducts = allExtractedProducts.concat(formattedProducts);
            console.log(`✅ Đã lấy được ${formattedProducts.length} sản phẩm từ trang này.`);

        } catch (error) {
            console.error(`❌ Lỗi khi crawl trang ${url}:`, error.message);
        }
    }

    await browser.close();

    // Xuất ra file JSON để dễ dàng kiểm tra và map vào CSDL 
    fs.writeFileSync('hasaki_products.json', JSON.stringify(allExtractedProducts, null, 2), 'utf-8');
    console.log(`\n🎉 Hoàn tất! Tổng số sản phẩm crawl được: ${allExtractedProducts.length}`);
    console.log(`Dữ liệu đã được lưu vào file hasaki_products.json`);

})();