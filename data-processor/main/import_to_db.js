const { Client } = require('pg');
const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const dns  = require('dns');

dns.setDefaultResultOrder('ipv4first');

const OUTPUT_PATH      = path.join(__dirname, '..\\..\\crawl-data\\pricehawk_output.json');
const BACKEND_CFG_PATH = path.join(__dirname, '..\\..\\backend\\src\\main\\resources\\application.yaml');

console.log('📌 Script bắt đầu...');
console.log('📂 OUTPUT_PATH     :', OUTPUT_PATH);
console.log('📂 BACKEND_CFG_PATH:', BACKEND_CFG_PATH);
console.log('');

async function importToDb() {
  let client = null;

  try {
    // 1. Đọc password từ backend config
    console.log('📖 Đọc cấu hình backend...');
    if (!fs.existsSync(BACKEND_CFG_PATH)) {
      throw new Error(`Không tìm thấy file: ${BACKEND_CFG_PATH}`);
    }
    const config    = yaml.load(fs.readFileSync(BACKEND_CFG_PATH, 'utf8'));
    const dbPassword = config.spring.datasource.password;
    console.log('✅ Đọc config xong');

    // 2. Kết nối DB
    client = new Client({
      host:     'aws-1-ap-northeast-2.pooler.supabase.com',
      port:     5432,
      database: 'postgres',
      user:     'postgres.astkanfsacxriwprspqr',
      password: dbPassword,
      ssl:      { rejectUnauthorized: false },
    });
    console.log('⏳ Kết nối Supabase...');
    await client.connect();
    console.log('✅ Kết nối thành công!\n');

    // 3. Đọc file output
    console.log('📖 Đọc file output...');
    if (!fs.existsSync(OUTPUT_PATH)) {
      throw new Error(`Không tìm thấy file: ${OUTPUT_PATH}`);
    }
    const json     = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    const products = json.products;
    console.log(`🚀 Bắt đầu import ${products.length} sản phẩm...\n`);

    let successCount = 0;
    let errorCount   = 0;

    for (let i = 0; i < products.length; i++) {
      const entry       = products[i];
      const productName = entry.product?.name || 'Không tên';

      try {
        await client.query('BEGIN');

        // A. BRAND
        const brandRes = await client.query(
          `INSERT INTO brand (name, slug)
           VALUES ($1, $2)
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [entry.brand.name, entry.brand.slug]
        );
        const brandId = brandRes.rows[0].id;

        // B. CATEGORY
        const catName = entry.product.category_name || 'Cham soc da';
        const catSlug = catName
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .replace(/\s+/g, '-');

        let categoryId;
        const existCat = await client.query(
          `SELECT id FROM category WHERE slug = $1 LIMIT 1`,
          [catSlug]
        );
        if (existCat.rows.length > 0) {
          categoryId = existCat.rows[0].id;
        } else {
          const newCat = await client.query(
            `INSERT INTO category (name, slug) VALUES ($1, $2) RETURNING id`,
            [catName, catSlug]
          );
          categoryId = newCat.rows[0].id;
        }

        // C. PRODUCT
        const prod    = entry.product;
        const prodRes = await client.query(
          `INSERT INTO product (
             name, brand_id, category_id, barcode,
             description, image_url, skin_type,
             volume_ml, attributes, popularity_score
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (name) DO UPDATE SET
             updated_at  = NOW(),
             description = COALESCE(EXCLUDED.description, product.description),
             image_url   = COALESCE(EXCLUDED.image_url,   product.image_url),
             barcode     = COALESCE(EXCLUDED.barcode,     product.barcode)
           RETURNING id`,
          [
            prod.name,
            brandId,
            categoryId,
            prod.barcode          || null,
            prod.description      || null,
            prod.image_url        || null,
            prod.skin_type        || null,
            prod.volume_ml        || null,
            JSON.stringify(prod.attributes || {}),
            prod.popularity_score ?? 0,
          ]
        );
        const productId = prodRes.rows[0].id;

        // D. LISTINGS + PRICE_RECORD
        const listings = entry.listings || [];
        for (const listing of listings) {
          const listRes = await client.query(
            `INSERT INTO product_listing (
               product_id, platform_id, platform_name, url,
               platform_image_url, crawl_time,
               status, trust_score, is_fake_promo, is_pinned
             )
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (url) DO UPDATE SET
               updated_at         = NOW(),
               platform_id        = EXCLUDED.platform_id,
               platform_name      = EXCLUDED.platform_name,
               platform_image_url = COALESCE(EXCLUDED.platform_image_url, product_listing.platform_image_url),
               status             = EXCLUDED.status,
               trust_score        = EXCLUDED.trust_score
             RETURNING id`,
            [
              productId,
              listing.platform_id,
              listing.platform_name,
              listing.url,
              listing.platform_image_url || null,
              listing.crawl_time         || null,
              listing.status             || 'active',
              listing.trust_score        ?? 1.0,
              listing.is_fake_promo      ?? false,
              listing.is_pinned          ?? false,
            ]
          );
          const listingId = listRes.rows[0].id;

          // price_record
          const pr = listing.price_record;
          if (pr && pr.price && pr.price > 0) {
            await client.query(
              `INSERT INTO price_record (
                 product_listing_id, price, original_price,
                 discount_pct, in_stock, is_flash_sale, promotion_label
               )
               VALUES ($1,$2,$3,$4,$5,$6,$7)`,
              [
                listingId,
                Math.round(pr.price),
                pr.original_price  ? Math.round(pr.original_price) : null,
                pr.discount_pct    ?? null,
                pr.in_stock        ?? true,
                pr.is_flash_sale   ?? false,
                pr.promotion_label || null,
              ]
            );
          }
        }

        await client.query('COMMIT');
        successCount++;

        if (i % 20 === 0 || i === products.length - 1) {
          console.log(`⭐ [${i + 1}/${products.length}] ✔ ${productName}`);
        }

      } catch (itemErr) {
        await client.query('ROLLBACK');
        errorCount++;
        console.error(`❌ [${i + 1}] Lỗi "${productName}": ${itemErr.message}`);
      }
    }

    console.log(`\n${'─'.repeat(40)}`);
    console.log(`✅ Thành công: ${successCount}`);
    console.log(`❌ Thất bại:   ${errorCount}`);
    console.log(`🎉 Import hoàn tất!`);

  } catch (err) {
    console.error('💥 LỖI HỆ THỐNG:', err.message);
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 Đã đóng kết nối.');
    }
  }
}

importToDb().then(() => {
  console.log('🏁 Script kết thúc.');
}).catch((err) => {
  console.error('💥 Lỗi ngoài cùng:', err);
});