import fs from 'fs/promises';
import path from 'path';

type SourceRecord = {
  name?: string;
  brandName?: string;
  productUrl?: string;
  url?: string;
  imageUrl?: string;
  galleryImages?: string[];
  price?: number;
  originalPrice?: number;
  discountPct?: number;
  inStock?: boolean;
  description?: string;
  categoryName?: string;
  platform: string;
  [key: string]: any;
};

type GeminiGroup = {
  groupName: string;
  members: {
    url: string;
    matchScore: number;
  }[];
};

type GeminiGroupsJson = Record<string, GeminiGroup[]>;
type UrlIndexJson = Record<string, SourceRecord>;

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function readJson<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function writeJson(filePath: string, data: any) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function pickBestRecord(records: SourceRecord[]): SourceRecord {
  // ưu tiên có description + giá
  return records.sort((a, b) => {
    const scoreA = (a.description ? 1 : 0) + (a.price ? 1 : 0);
    const scoreB = (b.description ? 1 : 0) + (b.price ? 1 : 0);
    return scoreB - scoreA;
  })[0];
}

async function main() {
  const GROUPS_FILE = './output/gemini-groups.json';
  const URL_INDEX_FILE = './output/url-index.json';
  const OUTPUT_FILE = './output/master-products.json';

  const groups = await readJson<GeminiGroupsJson>(GROUPS_FILE);
  const urlIndex = await readJson<UrlIndexJson>(URL_INDEX_FILE);

  const results: any[] = [];

  for (const [brandKey, brandGroups] of Object.entries(groups)) {
    for (const group of brandGroups) {
      const urls = group.members.map((m) => m.url);

      const records: SourceRecord[] = [];

      for (const url of urls) {
        const record = urlIndex[url];
        if (record) {
          records.push(record);
        }
      }

      if (records.length === 0) continue;

      const best = pickBestRecord(records);

      const brandName = best.brandName || brandKey;

      const product = {
        name: best.name,
        slug: slugify(best.name || ''),
        barcode: best.barcode || null,
        description: best.description || null,
        category_name: best.categoryName || null,
      };

      const listings = records.map((r) => ({
        ...r,
        platform: r.platform,
        matchScore:
          group.members.find((m) => m.url === (r.productUrl || r.url))
            ?.matchScore || 1,
        db_url: r.productUrl || r.url,
        db_image: r.imageUrl || r.galleryImages?.[0] || null,
        db_current_price: r.price || null,
        db_original_price: r.originalPrice || null,
        db_discount_pct: r.discountPct || 0,
        db_in_stock: r.inStock ?? true,
      }));

      results.push({
        brand: {
          name: brandName,
          slug: slugify(brandName),
        },
        product,
        listings,
      });
    }
  }

  await writeJson(OUTPUT_FILE, results);

  console.log('✅ Build master products DONE');
  console.log(`👉 Output: ${OUTPUT_FILE}`);
  console.log(`👉 Total products: ${results.length}`);
}

main().catch(console.error);