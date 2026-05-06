import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

type GeminiInputItem = {
  brand: string;
  brandKey: string;
  name: string;
  url: string;
  platform: 'hasaki' | 'cocolux' | 'guardian' | string;
};

type GeminiBucketsJson = Record<string, GeminiInputItem[]>;

type GeminiGroupMember = {
  url: string;
  matchScore: number;
};

type GeminiGroup = {
  groupName: string;
  members: GeminiGroupMember[];
};

type GeminiGroupsJson = Record<string, GeminiGroup[]>;

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJsonParse<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

function buildPrompt(brandKey: string, items: GeminiInputItem[]): string {
  const productList = items.map((item, index) => ({
    id: index + 1,
    brand: item.brand,
    name: item.name,
    url: item.url,
    platform: item.platform,
  }));

  return `
Bạn là hệ thống so khớp tên sản phẩm giữa nhiều sàn thương mại điện tử.

Tất cả sản phẩm dưới đây đều thuộc cùng một brandKey: "${brandKey}".

Nhiệm vụ:
- Nhóm các sản phẩm là cùng một sản phẩm gốc vào cùng một group.
- Chỉ dựa trên brand và name để quyết định.
- Nếu khác size, khác số lượng chính, khác màu, khác variant quan trọng thì không nhóm chung.
- Nếu chỉ khác cách viết, ngôn ngữ, viết tắt, thứ tự từ thì vẫn nhóm chung.
- Nếu chỉ khác combo 2/combo 3/combo 4 nhưng rõ ràng là cùng sản phẩm gốc thì có thể nhóm chung.
- Không suy đoán quá mức.
- Không được làm rơi URL nào. Mỗi URL phải xuất hiện đúng 1 lần trong toàn bộ output.
- Nếu 1 sản phẩm không khớp với sản phẩm nào khác thì vẫn phải tạo group riêng cho nó.
- matchScore là số từ 0 đến 1. Nếu là sản phẩm đại diện hoặc match rất chắc thì có thể là 1.0.

Trả về JSON only, đúng format:
[
  {
    "groupName": "tên đại diện ngắn gọn",
    "members": [
      {
        "url": "https://...",
        "matchScore": 1.0
      }
    ]
  }
]

Danh sách sản phẩm:
${JSON.stringify(productList, null, 2)}
  `.trim();
}

async function callGemini(prompt: string, apiKey: string, model: string): Promise<GeminiGroup[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API failed (${response.status}): ${errorText}`);
  }

  const data = await response.json() as any;
  const text =
    data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text ?? '').join('') ?? '';

  if (!text) {
    throw new Error('Gemini returned empty text response.');
  }

  return safeJsonParse<GeminiGroup[]>(text);
}

function validateGroups(originalItems: GeminiInputItem[], groups: GeminiGroup[]): GeminiGroup[] {
  const originalUrls = new Set(originalItems.map((item) => item.url));
  const seenUrls = new Set<string>();
  const normalizedGroups: GeminiGroup[] = [];

  for (const group of groups) {
    const members: GeminiGroupMember[] = [];

    for (const member of group.members || []) {
      const url = normalizeText(member.url);
      if (!url) continue;
      if (!originalUrls.has(url)) continue;
      if (seenUrls.has(url)) continue;

      seenUrls.add(url);
      members.push({
        url,
        matchScore: Number(member.matchScore ?? 0),
      });
    }

    if (members.length > 0) {
      normalizedGroups.push({
        groupName: normalizeText(group.groupName) || members[0].url,
        members,
      });
    }
  }

  // Không để rơi URL nào: URL chưa xuất hiện thì tự tạo group riêng
  for (const item of originalItems) {
    if (!seenUrls.has(item.url)) {
      normalizedGroups.push({
        groupName: item.name,
        members: [
          {
            url: item.url,
            matchScore: 1,
          },
        ],
      });
    }
  }

  return normalizedGroups;
}

async function processBrand(
  brandKey: string,
  items: GeminiInputItem[],
  apiKey: string,
  model: string,
  maxRetries: number,
): Promise<GeminiGroup[]> {
  const prompt = buildPrompt(brandKey, items);

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const groups = await callGemini(prompt, apiKey, model);
      return validateGroups(items, groups);
    } catch (error) {
      lastError = error;
      console.warn(`Retry ${attempt}/${maxRetries} failed for brand ${brandKey}:`, error);
      if (attempt < maxRetries) {
        await sleep(1500 * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function main(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in environment.');
  }

  const INPUT_FILE = process.argv[2] || './output/gemini-input.by-brand.json';
  const OUTPUT_FILE = process.argv[3] || './output/gemini-groups.json';
  const MODEL = process.argv[4] || 'gemini-2.5-flash';
  const SINGLE_BRAND = process.argv[5] || '';

  const brandBuckets = await readJsonFile<GeminiBucketsJson>(INPUT_FILE);

  let existingOutput: GeminiGroupsJson = {};
  try {
    existingOutput = await readJsonFile<GeminiGroupsJson>(OUTPUT_FILE);
  } catch {
    existingOutput = {};
  }

  const entries = Object.entries(brandBuckets)
    .filter(([brandKey]) => !SINGLE_BRAND || brandKey === SINGLE_BRAND)
    .sort(([a], [b]) => a.localeCompare(b, 'vi'));

  if (entries.length === 0) {
    console.log('No brand buckets found to process.');
    return;
  }

  for (const [brandKey, items] of entries) {
    if (existingOutput[brandKey] && existingOutput[brandKey].length > 0) {
      console.log(`Skipping ${brandKey} because it already exists in output.`);
      continue;
    }

    console.log(`Processing brand: ${brandKey} (${items.length} items)`);

    const groups = await processBrand(brandKey, items, apiKey, MODEL, 3);
    existingOutput[brandKey] = groups;

    await writeJsonFile(OUTPUT_FILE, existingOutput);
    console.log(`Saved ${brandKey} -> ${groups.length} groups`);
    await sleep(800);
  }

  console.log('Done.');
  console.log(`Wrote: ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
