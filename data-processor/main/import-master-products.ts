import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

// ===== CONFIG PATH =====
const MASTER_DATA_PATH = path.join(__dirname, '../output/master-products.json');
const BACKEND_CONFIG_PATH = path.join(__dirname, '../../backend/src/main/resources/application.yml');

// ===== TYPES =====
type ProductEntry = {
  brand?: {
    name?: string;
    slug?: string;
  };
  product?: {
    name?: string;
    category_name?: string;
    barcode?: string | null;
    description?: string | null;
    volume_ml?: number | null;
    attributes?: Record<string, any>;
  };
  listings?: Array<{
    platform?: string;
    db_url?: string;
    db_image?: string | null;
    db_current_price?: number;
    db_original_price?: number;
    db_discount_pct?: number;
    db_in_stock?: boolean;
  }>;
};

// ===== UTILS =====
function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function safeJsonParse<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function getErrorMeta(err: any) {
  return {
    message: err?.message,
    code: err?.code,
    detail: err?.detail,
    hint: err?.hint,
    table: err?.table,
    constraint: err?.constraint,
    where: err?.where,
  };
}

async function importJsonToDb() {
  let client: Client | null = null;

  try {
    console.log('📖 Đang đọc config DB...');
    const yamlContent = fs.readFileSync(BACKEND_CONFIG_PATH, 'utf8');
    const config: any = yaml.load(yamlContent);
    const dbPassword = config?.spring?.datasource?.password;

    if (!dbPassword) {
      throw new Error('Không tìm thấy DB password trong application.yml');
    }

    client = new Client({
      host: 'aws-1-ap-northeast-2.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      user: 'postgres.astkanfsacxriwprspqr',
      password: dbPassword,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    console.log('✅ Connected DB');

    const data = safeJsonParse<ProductEntry[]>(MASTER_DATA_PATH);

    if (!Array.isArray(data)) {
      throw new Error('master-products.json không phải là array');
    }

    console.log(`🚀 Import ${data.length} products`);

    let success = 0;
    let fail = 0;

    for (let i = 0; i < data.length; i++) {
      const entry = data[i];
      const productName = entry.product?.name?.trim() || `Unknown-${i}`;

      try {
        await client.query('BEGIN');

        // ===== BRAND =====
        const brandName = entry.brand?.name?.trim() || 'Unknown';
        const brandSlug = entry.brand?.slug?.trim() || slugify(brandName);

        const brandRes = await client.query(
          `
          INSERT INTO brand (name, slug)
          VALUES ($1, $2)
          ON CONFLICT (slug)
          DO UPDATE SET name = EXCLUDED.name
          RETURNING id
          `,
          [brandName, brandSlug]
        );

        const brandId = brandRes.rows[0]?.id;
        if (!brandId) {
          throw new Error(`Không lấy được brandId cho brand="${brandName}"`);
        }

        // ===== CATEGORY =====
        const categoryName = entry.product?.category_name?.trim() || 'Uncategorized';
        const categorySlug = slugify(categoryName);

        const categoryRes = await client.query(
          `
          INSERT INTO category (name, slug)
          VALUES ($1, $2)
          ON CONFLICT (slug)
          DO UPDATE SET name = EXCLUDED.name
          RETURNING id
          `,
          [categoryName, categorySlug]
        );

        const categoryId = categoryRes.rows[0]?.id;
        if (!categoryId) {
          throw new Error(`Không lấy được categoryId cho category="${categoryName}"`);
        }

        // ===== PRODUCT =====
        const barcode = entry.product?.barcode || null;
        const description = entry.product?.description || null;
        const volumeMl = entry.product?.volume_ml ?? null;
        const attributes = entry.product?.attributes || {};

        const prodRes = await client.query(
          `
          INSERT INTO product (
            name, brand_id, category_id, barcode,
            description, volume_ml, attributes, popularity_score
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (name)
          DO UPDATE SET
            brand_id = EXCLUDED.brand_id,
            category_id = EXCLUDED.category_id,
            barcode = EXCLUDED.barcode,
            description = EXCLUDED.description,
            volume_ml = EXCLUDED.volume_ml,
            attributes = EXCLUDED.attributes,
            updated_at = NOW()
          RETURNING id
          `,
          [
            productName,
            brandId,
            categoryId,
            barcode,
            description,
            volumeMl,
            JSON.stringify(attributes),
            0,
          ]
        );

        const productId = prodRes.rows[0]?.id;
        if (!productId) {
          throw new Error(`Không lấy được productId cho product="${productName}"`);
        }

        // ===== LISTINGS =====
        for (const store of entry.listings || []) {
          const rawPlatform = (store.platform || '').trim().toLowerCase();
          const dbUrl = store.db_url?.trim();

          if (!dbUrl) {
            console.warn(`⚠ Bỏ qua listing vì thiếu url | product="${productName}"`);
            continue;
          }

          const platformRes = await client.query(
            `SELECT id FROM platform WHERE LOWER(name) = $1 LIMIT 1`,
            [rawPlatform]
          );

          const platformId = platformRes.rows[0]?.id || 1;
          const displayPlatformName =
            rawPlatform.charAt(0).toUpperCase() + rawPlatform.slice(1) || 'Unknown';

          const currentPrice = Number(store.db_current_price || 0);
          const originalPrice = Number(store.db_original_price || currentPrice);

          const listRes = await client.query(
            `
            INSERT INTO product_listing (
              product_id, platform_id, platform_name,
              url, platform_image_url, status,
              is_fake_promo, is_pinned, trust_score
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT (url)
            DO UPDATE SET
              updated_at = NOW(),
              product_id = EXCLUDED.product_id,
              platform_id = EXCLUDED.platform_id,
              platform_name = EXCLUDED.platform_name,
              platform_image_url = EXCLUDED.platform_image_url,
              status = EXCLUDED.status,
              is_fake_promo = EXCLUDED.is_fake_promo,
              is_pinned = EXCLUDED.is_pinned,
              trust_score = EXCLUDED.trust_score
            RETURNING id
            `,
            [
              productId,
              platformId,
              displayPlatformName,
              dbUrl,
              store.db_image || null,
              'active',
              false,
              false,
              1.0,
            ]
          );

          const listingId = listRes.rows[0]?.id;
          if (!listingId) {
            throw new Error(`Không lấy được listingId | url="${dbUrl}"`);
          }

          if (currentPrice > 0) {
            await client.query(
              `
              INSERT INTO price_record (
                product_listing_id, price, original_price,
                discount_pct, in_stock
              )
              VALUES ($1,$2,$3,$4,$5)
              `,
              [
                listingId,
                currentPrice,
                originalPrice,
                store.db_discount_pct || 0,
                store.db_in_stock ?? true,
              ]
            );
          }
        }

        await client.query('COMMIT');
        success++;
        console.log(`✔ ${i + 1}/${data.length}: ${productName}`);
      } catch (err: any) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackErr: any) {
          console.error(`💥 ROLLBACK FAILED at ${i}:`, getErrorMeta(rollbackErr));
        }

        fail++;
        console.error(`❌ Error at ${i} | product="${productName}"`);
        console.error(getErrorMeta(err));
      }
    }

    console.log(`\n✅ Done: ${success}`);
    console.log(`❌ Failed: ${fail}`);
  } catch (err: any) {
    console.error('💥 SYSTEM ERROR:', getErrorMeta(err));
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 DB connection closed');
    }
  }
}

importJsonToDb();