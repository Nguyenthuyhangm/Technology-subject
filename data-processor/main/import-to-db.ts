import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import dns from 'dns';

// 1. SỬA LỖI ENOTFOUND: Ép Node.js ưu tiên IPv4 (tránh lỗi IPv6 của Supabase)
dns.setDefaultResultOrder('ipv4first');

// 2. ĐỊNH VỊ ĐƯỜNG DẪN
const MASTER_DATA_PATH = path.join(__dirname, '../../storage/output/master-products.json');
const BACKEND_CONFIG_PATH = path.join(__dirname, '../../backend/src/main/resources/application.yml');

async function importJsonToDb() {
    let client: Client | null = null;

    try {
        // 3. ĐỌC CẤU HÌNH TỪ BACKEND
        console.log("📖 Đang lấy cấu hình từ backend...");
        if (!fs.existsSync(BACKEND_CONFIG_PATH)) {
            throw new Error(`Không tìm thấy application.yml tại: ${BACKEND_CONFIG_PATH}`);
        }
        const yamlContent = fs.readFileSync(BACKEND_CONFIG_PATH, 'utf8');
        const config: any = yaml.load(yamlContent);
        const dbPassword = config.spring.datasource.password;

        // 4. KẾT NỐI DATABASE (Sử dụng Pooler của bạn)
        client = new Client({
            host: 'aws-1-ap-northeast-2.pooler.supabase.com',
            port: 5432,
            database: 'postgres',
            user: 'postgres.astkanfsacxriwprspqr',
            password: dbPassword,
            ssl: { rejectUnauthorized: false }
        });

        console.log("⏳ Đang kết nối tới Supabase...");
        await client.connect();
        console.log("✅ Kết nối thành công!");

        // 5. ĐỌC DỮ LIỆU JSON
        if (!fs.existsSync(MASTER_DATA_PATH)) {
            throw new Error(`Không tìm thấy master-products.json tại: ${MASTER_DATA_PATH}`);
        }
        const data = JSON.parse(fs.readFileSync(MASTER_DATA_PATH, 'utf-8'));
        console.log(`🚀 Bắt đầu xử lý ${data.length} sản phẩm...`);

        let successCount = 0;
        let errorCount = 0;

        // 6. VÒNG LẶP XỬ LÝ TỪNG SẢN PHẨM
        for (let i = 0; i < data.length; i++) {
            const entry = data[i];
            const productName = entry.product?.name || "Sản phẩm không tên";

            try {
                // --- A. XỬ LÝ BRAND ---
                const brandRes = await client.query(
                    `INSERT INTO brand (name, slug) VALUES ($1, $2) 
                     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
                    [entry.brand.name, entry.brand.slug]
                );
                const brandId = brandRes.rows[0].id;

                // --- B. XỬ LÝ CATEGORY ---
                const categoryName = entry.product.category_name || 'Uncategorized';
                const categorySlug = categoryName.toLowerCase().trim().replace(/\s+/g, '-');
                                    
                let categoryId;
                try {
                    // Bước 1: Cố gắng chèn mới (Bỏ ON CONFLICT đi để đối mặt với mọi loại lỗi trùng lặp)
                    const cateRes = await client.query(
                        `INSERT INTO category (name, slug) VALUES ($1, $2) RETURNING id`,
                        [categoryName, categorySlug]
                    );
                    categoryId = cateRes.rows[0].id;
                } catch (cateError: any) {
                    // Bước 2: Nếu Database báo lỗi (do trùng name hoặc trùng slug vì viết hoa/thường)
                    // Mình lờ đi, tự động chạy lệnh SELECT để lục tìm ID của danh mục đó ra xài.
                    const existingCate = await client.query(
                        `SELECT id FROM category WHERE slug = $1 OR name = $2 LIMIT 1`,
                        [categorySlug, categoryName]
                    );
                    
                    if (existingCate.rows.length > 0) {
                        categoryId = existingCate.rows[0].id;
                    } else {
                        throw cateError; // Trừ khi lỗi mạng/database sập thì mới văng lỗi thực sự
                    }
                }

                // --- C. XỬ LÝ PRODUCT ---
                const prodRes = await client.query(
                    `INSERT INTO product (name, brand_id, category_id, barcode, description, volume_ml, attributes, popularity_score) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                     ON CONFLICT (name) DO UPDATE SET updated_at = NOW() RETURNING id`,
                    [
                        productName, 
                        brandId, 
                        categoryId, 
                        entry.product.barcode || null,
                        entry.product.description || null, 
                        parseInt(String(entry.product.volume_ml).replace(/[^0-9]/g, '')) || 0, 
                        JSON.stringify(entry.product.attributes || {}), 
                        0
                    ]
                );
                const productId = prodRes.rows[0].id;

                // --- D. XỬ LÝ LISTINGS & PRICES ---
                const shopData = entry.listings || entry.stores || [];
                for (const store of shopData) {
                    // 1. Chuẩn hóa về chữ thường để xét logic (không sợ lỗi viết hoa/thường)
                    const rawName = (store.platform || '').toLowerCase();
                    
                    // 2. Viết hoa chữ cái đầu để hiển thị cho đẹp (VD: 'hasaki' -> 'Hasaki')
                    const displayPlatformName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
                    
                    // 3. Gắn ID chuẩn khớp với bảng platform
                    let platformId = 1; // Mặc định 1 là Cocolux
                    if (rawName === 'hasaki') {
                        platformId = 3; 
                    } else if (rawName === 'guardian') {
                        platformId = 2; 
                    }
                    
                    // 4. Xử lý giá an toàn
                    const currentPrice = store.db_current_price || store.price || 0;
                    const originalPrice = store.db_original_price || store.originalPrice || currentPrice;

                    // 5. Chèn/Cập nhật Listing
                    const listRes = await client.query(
                        `INSERT INTO product_listing (
                            product_id, platform_id, platform_name, url, 
                            platform_image_url, status, is_fake_promo, is_pinned, trust_score
                        ) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                        ON CONFLICT (url) DO UPDATE SET 
                            updated_at = NOW(),
                            status = EXCLUDED.status,
                            platform_id = EXCLUDED.platform_id,
                            platform_name = EXCLUDED.platform_name 
                        RETURNING id`,
                        [
                            productId, 
                            platformId,   
                            displayPlatformName, // Dùng tên đã viết hoa chữ cái đầu để lưu
                            store.db_url || store.url, 
                            store.db_image || store.imageUrl || (store.galleryImages?.[0]), 
                            'active',
                            false, // is_fake_promo
                            false, // is_pinned
                            1.0    // trust_score
                        ]
                    );
                    const listingId = listRes.rows[0].id;

                    // 6. Chèn Lịch sử giá (Chỉ chèn nếu có giá trị)
                    if (currentPrice > 0) {
                        await client.query(
                            `INSERT INTO price_record (product_listing_id, price, original_price, discount_pct, in_stock) 
                             VALUES ($1, $2, $3, $4, $5)`,
                            [
                                listingId, 
                                currentPrice, 
                                originalPrice, 
                                store.db_discount_pct || store.discountPct || 0, 
                                store.db_in_stock ?? store.inStock ?? true
                            ]
                        );
                    }
                }

                successCount++;
                if (i % 10 === 0) console.log(`⭐ [${i}/${data.length}] ✔ Xong: ${productName}`);

            } catch (itemError: any) {
                errorCount++;
                console.error(`❌ Lỗi tại SP thứ ${i} (${productName}):`, itemError.message);
                continue; 
            }
        }

        console.log(`\n--- KẾT QUẢ CUỐI CÙNG ---`);
        console.log(`✅ Thành công: ${successCount}`);
        console.log(`❌ Thất bại: ${errorCount}`);
        console.log(`🎉 Dữ liệu đã được đồng bộ. Hãy kiểm tra Supabase!`);

    } catch (err: any) {
        console.error("💥 LỖI HỆ THỐNG:", err.message);
    } finally {
        if (client) {
            await client.end();
            console.log("🔌 Đã đóng kết nối Database.");
        }
    }
}

importJsonToDb();