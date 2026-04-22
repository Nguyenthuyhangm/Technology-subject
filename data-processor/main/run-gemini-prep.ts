import fs from 'fs/promises';
import path from 'path';

type HasakiRecord = {
  id?: string;
  name?: string;
  brandName?: string;
  productUrl?: string;
  imageUrl?: string | null;
  price?: number | null;
  originalPrice?: number | null;
  discountPct?: number | null;
  inStock?: boolean | null;
  barcode?: string | null;
  categoryName?: string | null;
  categoryPath?: string | null;
  volumeValue?: number | null;
  volumeUnit?: string | null;
  packSize?: number | null;
  [key: string]: unknown;
};

type CocoluxRecord = {
  url?: string;
  name?: string;
  brandName?: string;
  galleryImages?: string[] | null;
  price?: number | null;
  originalPrice?: number | null;
  discountPct?: number | null;
  inStock?: boolean | null;
  barcode?: string | null;
  description?: string | null;
  benefits?: string | null;
  usage?: string | null;
  ingredients?: string | null;
  breadcrumb?: string[] | null;
  [key: string]: unknown;
};

type GuardianRecord = {
  id?: string;
  name?: string;
  brandName?: string;
  productUrl?: string;
  url?: string;
  imageUrl?: string | null;
  price?: number | null;
  originalPrice?: number | null;
  discountPct?: number | null;
  inStock?: boolean | null;
  barcode?: string | null;
  categoryName?: string | null;
  categoryPath?: string | null;
  volumeValue?: number | null;
  volumeUnit?: string | null;
  packSize?: number | null;
  [key: string]: unknown;
};

type SourceRecord = (HasakiRecord | CocoluxRecord | GuardianRecord) & {
  platform: 'hasaki' | 'cocolux' | 'guardian';
};

type GeminiInputItem = {
  brand: string;
  brandKey: string;
  name: string;
  url: string;
  platform: 'hasaki' | 'cocolux' | 'guardian';
};

type UrlIndexJson = Record<string, SourceRecord>;
type GeminiBucketsJson = Record<string, GeminiInputItem[]>;

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeUrl(value: unknown): string {
  return normalizeText(value);
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeBrandName(value: unknown): string {
  const raw = normalizeText(value);
  if (!raw) return '';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function buildUrlIndex(
  hasakiData: HasakiRecord[],
  cocoluxData: CocoluxRecord[],
  guardianData: GuardianRecord[],
): Map<string, SourceRecord> {
  const urlIndex = new Map<string, SourceRecord>();

  for (const item of hasakiData) {
    const url = normalizeUrl(item.productUrl);
    if (!url) continue;

    urlIndex.set(url, {
      ...item,
      platform: 'hasaki',
    });
  }

  for (const item of cocoluxData) {
    const url = normalizeUrl(item.url);
    if (!url) continue;

    urlIndex.set(url, {
      ...item,
      platform: 'cocolux',
    });
  }

  for (const item of guardianData) {
    const url = normalizeUrl(item.productUrl || item.url);
    if (!url) continue;

    urlIndex.set(url, {
      ...item,
      platform: 'guardian',
    });
  }

  return urlIndex;
}

function buildGeminiInput(
  hasakiData: HasakiRecord[],
  cocoluxData: CocoluxRecord[],
  guardianData: GuardianRecord[],
): GeminiInputItem[] {
  const rows: GeminiInputItem[] = [];

  for (const item of hasakiData) {
    const brand = normalizeText(item.brandName);
    const name = normalizeText(item.name);
    const url = normalizeUrl(item.productUrl);

    if (!brand || !name || !url) continue;

    rows.push({
      brand,
      brandKey: normalizeBrandName(brand),
      name,
      url,
      platform: 'hasaki',
    });
  }

  for (const item of cocoluxData) {
    const brand = normalizeText(item.brandName);
    const name = normalizeText(item.name);
    const url = normalizeUrl(item.url);

    if (!brand || !name || !url) continue;

    rows.push({
      brand,
      brandKey: normalizeBrandName(brand),
      name,
      url,
      platform: 'cocolux',
    });
  }

  for (const item of guardianData) {
    const brand = normalizeText(item.brandName);
    const name = normalizeText(item.name);
    const url = normalizeUrl(item.productUrl || item.url);

    if (!brand || !name || !url) continue;

    rows.push({
      brand,
      brandKey: normalizeBrandName(brand),
      name,
      url,
      platform: 'guardian',
    });
  }

  return rows;
}

function groupGeminiInputByBrand(rows: GeminiInputItem[]): Map<string, GeminiInputItem[]> {
  const buckets = new Map<string, GeminiInputItem[]>();

  for (const row of rows) {
    if (!row.brandKey) continue;
    if (!buckets.has(row.brandKey)) {
      buckets.set(row.brandKey, []);
    }
    buckets.get(row.brandKey)!.push(row);
  }

  for (const [brandKey, items] of buckets.entries()) {
    items.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    buckets.set(brandKey, items);
  }

  return buckets;
}

function mapToPlainObject<T>(map: Map<string, T>): Record<string, T> {
  return Object.fromEntries(map.entries());
}

async function main(): Promise<void> {
  const HASAKI_FILE =
    process.argv[2] || '../hasaki-crawler/storage/output/normalized-products.json';
  const COCOLUX_FILE =
    process.argv[3] || '../cocolux-crawler/storage/output/details.json';
  const GUARDIAN_FILE =
    process.argv[4] || '../guardian-crawler/nomalized.json';
  const OUTPUT_DIR = process.argv[5] || './output';

  const hasakiData = await readJsonFile<HasakiRecord[]>(HASAKI_FILE);
  const cocoluxData = await readJsonFile<CocoluxRecord[]>(COCOLUX_FILE);
  const guardianData = await readJsonFile<GuardianRecord[]>(GUARDIAN_FILE);

  const urlIndex = buildUrlIndex(hasakiData, cocoluxData, guardianData);
  const geminiInput = buildGeminiInput(hasakiData, cocoluxData, guardianData);
  const geminiBuckets = groupGeminiInputByBrand(geminiInput);

  const urlIndexJson: UrlIndexJson = mapToPlainObject(urlIndex);
  const geminiBucketsJson: GeminiBucketsJson = mapToPlainObject(geminiBuckets);

  const allGeminiInputPath = path.join(OUTPUT_DIR, 'gemini-input.all.json');
  const brandBucketsPath = path.join(OUTPUT_DIR, 'gemini-input.by-brand.json');
  const urlIndexPath = path.join(OUTPUT_DIR, 'url-index.json');
  const brandListPath = path.join(OUTPUT_DIR, 'brands.json');

  await writeJsonFile(allGeminiInputPath, geminiInput);
  await writeJsonFile(brandBucketsPath, geminiBucketsJson);
  await writeJsonFile(urlIndexPath, urlIndexJson);
  await writeJsonFile(
    brandListPath,
    Array.from(geminiBuckets.entries()).map(([brandKey, items]) => ({
      brandKey,
      displayBrand: items[0]?.brand ?? brandKey,
      count: items.length,
      fileHint: `${slugify(brandKey)}.json`,
    })),
  );

  console.log('Done.');
  console.log(`Hasaki records: ${hasakiData.length}`);
  console.log(`Cocolux records: ${cocoluxData.length}`);
  console.log(`Guardian records: ${guardianData.length}`);
  console.log(`URL index size: ${urlIndex.size}`);
  console.log(`Gemini input rows: ${geminiInput.length}`);
  console.log(`Brand buckets: ${geminiBuckets.size}`);
  console.log(`Wrote: ${allGeminiInputPath}`);
  console.log(`Wrote: ${brandBucketsPath}`);
  console.log(`Wrote: ${urlIndexPath}`);
  console.log(`Wrote: ${brandListPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});