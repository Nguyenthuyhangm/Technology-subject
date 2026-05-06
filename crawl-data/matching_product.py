

import json
import re
import unicodedata
import os
import time
import numpy as np
from datetime import datetime

# ─── CONFIG ────────────────────────────────────────────────────

MODEL_NAME  = "BAAI/bge-m3"
CACHE_EMB   = "embeddings_cache.npy"
CACHE_META  = "embeddings_meta.json"
OUTPUT_FILE = "pricehawk_output.json"

CFG = {
    "COSINE_CONFIRM": 0.82,
    "MAX_PRICE_RATIO": 3.5,
    "VOL_RE":    re.compile(r'(\d+(?:\.\d+)?)\s*(ml|gr?|oz|l(?!b))\b', re.I),
    "COUNT_RE":  re.compile(r'(\d+)\s*(tờ|miếng|viên|cái|gói|hộp|tuýp|chai)\b', re.I),
    "COMBO_RE":  re.compile(r'\b(combo|bộ đôi|bộ 2|set \d|pack \d|\dx\d)\b', re.I),
    "HSD_RE":    re.compile(r'\[hsd|hsd\s+\d', re.I),
    "ARTIFACT":  re.compile(r'node\s+crawl_\w+\.js', re.I),
}

# Thứ tự ưu tiên chọn representative (tên, ảnh, mô tả)
PRIORITY = ["tiki", "guardian", "hasaki", "cocolux", "watsons"]

# Platform ID map — khớp với bảng platform trong DB
PLATFORM_ID = {
    "cocolux":  1,
    "guardian": 2,
    "hasaki":   3,
    "tiki":     4,
    "watsons":  5,
}

SOURCE_FILES = {
    "cocolux":  {"file": "cocolux_full_data.json",  "label": "Cocolux",  "fmt": "brand_dict"},
    "guardian": {"file": "guardian_full_data.json", "label": "Guardian", "fmt": "brand_array"},
    "hasaki":   {"file": "hasaki_full_data.json",   "label": "Hasaki",   "fmt": "brand_dict"},
    "tiki":     {"file": "tiki_full_data.json",      "label": "Tiki",    "fmt": "brand_array"},
    "watsons":  {"file": "watsons_full_data.json",  "label": "Watsons",  "fmt": "brand_dict"},
}

# ─── CATEGORY CLASSIFIER ───────────────────────────────────────
# Đọc tên sản phẩm → phân loại category_name

CATEGORY_RULES = [
    ("Nước tẩy trang",    ["tẩy trang", "micellar", "cleansing water"]),
    ("Sữa rửa mặt",       ["rửa mặt", "cleanser", "foaming wash", "foam wash", "facial wash"]),
    ("Toner",             ["toner", "nước hoa hồng", "lotion dưỡng"]),
    ("Serum",             ["serum", "tinh chất", "ampoule", "essence"]),
    ("Kem chống nắng",    ["chống nắng", "sunscreen", "sunblock", "spf", "uv essence", "uv milk"]),
    ("Kem dưỡng",         ["kem dưỡng", "moisturizer", "cream", "baume", "balm", "gel dưỡng"]),
    ("Sản phẩm trị mụn",  ["trị mụn", "kem mụn", "gel mụn", "giảm mụn", "blemish"]),
    ("Miếng dán mụn",     ["miếng dán mụn", "clear patch", "acne patch", "dán mụn"]),
    ("Giấy thấm dầu",     ["thấm dầu", "oil remover", "oil control paper", "phim thấm"]),
    ("Dưỡng thể",         ["dưỡng thể", "body lotion", "body cream", "body milk", "lotion dưỡng thể"]),
    ("Lăn/xịt khử mùi",  ["khử mùi", "deodorant", "lăn ngăn mùi", "xịt ngăn mùi", "antiperspirant"]),
    ("Dầu gội",           ["dầu gội", "shampoo"]),
    ("Dầu xả",            ["dầu xả", "conditioner"]),
    ("Mặt nạ",            ["mặt nạ", "mask", "sheet mask"]),
    ("Tẩy tế bào chết",   ["tẩy tế bào chết", "exfoliant", "scrub"]),
    ("Nước xịt khoáng",   ["xịt khoáng", "thermal water", "mineral water"]),
]

def classify_category(name: str) -> str:
    name_lower = (name or "").lower()
    name_nfd = unicodedata.normalize("NFD", name_lower)
    name_nfd = "".join(c for c in name_nfd if unicodedata.category(c) != "Mn")

    for category_name, keywords in CATEGORY_RULES:
        for kw in keywords:
            kw_nfd = unicodedata.normalize("NFD", kw.lower())
            kw_nfd = "".join(c for c in kw_nfd if unicodedata.category(c) != "Mn")
            if kw_nfd in name_nfd:
                return category_name

    return "Chăm sóc da"  # default fallback

# ─── SLUG GENERATOR ────────────────────────────────────────────

def make_slug(text: str) -> str:
    s = unicodedata.normalize("NFD", (text or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s.strip())
    return s

# ─── TEXT UTILS ────────────────────────────────────────────────

def slug_brand(b: str) -> str:
    s = unicodedata.normalize("NFD", (b or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s)

def extract_vol(name: str):
    m = CFG["VOL_RE"].search(name or "")
    if not m:
        return None
    unit = m.group(2).lower().replace("gr", "g")
    return f"{float(m.group(1))}{unit}"

def extract_count(name: str):
    m = CFG["COUNT_RE"].search(name or "")
    return f"{m.group(1)}{m.group(2).lower()}" if m else None

def product_type(name: str) -> str:
    l = (name or "").lower()
    if CFG["COMBO_RE"].search(l): return "combo"
    if CFG["HSD_RE"].search(l):   return "hsd"
    return "normal"

def embed_name(name: str, brand: str) -> str:
    s = CFG["ARTIFACT"].sub("", name or "")
    if brand:
        s = re.sub(r"^\s*" + re.escape(brand) + r"\s+", "", s, flags=re.I)
    return s.strip()

# ─── LOAD DATA ─────────────────────────────────────────────────

def load_pool():
    pool = []
    for src_key, meta in SOURCE_FILES.items():
        fpath = meta["file"]
        if not os.path.exists(fpath):
            print(f"⚠️  Không tìm thấy: {fpath}")
            continue

        data = json.load(open(fpath, encoding="utf-8"))
        entries = []

        if meta["fmt"] == "brand_dict":
            for bn, bd in data.get("brands", {}).items():
                for p in bd.get("products", []):
                    entries.append((p, bn.replace("-", " ")))
        else:
            for be in data:
                bn = be.get("brand", "").replace("-", " ")
                for p in be.get("items", []):
                    entries.append((p, bn))

        for p, brand in entries:
            name = p.get("name") or ""

            # Image field — mỗi sàn dùng tên khác nhau
            image = p.get("image") or p.get("thumbnail") or ""

            # Discount — mỗi sàn dùng tên khác nhau
            discount = p.get("discount_percent") or p.get("discount_rate")

            # in_stock — tiki dùng quantity_sold, còn lại không có → mặc định True

            in_stock = True

            # Flash sale — hasaki có badge
            badge = (p.get("badge") or "").strip()
            is_flash_sale = bool(badge and ("flash" in badge.lower() or "sale" in badge.lower()))
            promotion_label = badge if badge else None

            pool.append({
                # Matching fields
                "embed_text":  embed_name(name, brand),
                "brand_slug":  slug_brand(brand),
                "vol":         extract_vol(name),
                "count":       extract_count(name),
                "type":        product_type(name),
                "source":      src_key,

                # DB fields — product
                "original_name":   name,
                "brand":           brand,
                "barcode":         p.get("sku") or p.get("product_code") or p.get("externalId"),
                "description":     p.get("description") or "",
                "image":           image,
                "category_name":   classify_category(name),

                # DB fields — product_listing
                "url":             p.get("url") or "",
                "label":           meta["label"],
                "platform_id":     PLATFORM_ID.get(src_key, 0),
                "crawled_at":      p.get("crawled_at"),

                # DB fields — price_record
                "price":           p.get("price"),
                "original_price":  p.get("original_price"),
                "discount_pct":    float(discount) if discount is not None else None,
                "in_stock":        in_stock,
                "is_flash_sale":   is_flash_sale,
                "promotion_label": promotion_label,

                # Extra info
                "rating":          p.get("rating"),
                "review_count":    p.get("review_count"),
                "quantity_sold":   quantity_sold,
            })

        print(f"  ✅ {meta['label']:10s}: {len(entries):4d} sản phẩm")

    return pool

# ─── EMBEDDING ─────────────────────────────────────────────────

def compute_or_load_embeddings(pool, model):
    texts     = [p["embed_text"] for p in pool]
    cache_key = str(len(texts)) + "|" + "|".join(t[:30] for t in texts[:5])

    if os.path.exists(CACHE_EMB) and os.path.exists(CACHE_META):
        meta = json.load(open(CACHE_META))
        if meta.get("key") == cache_key and meta.get("model") == MODEL_NAME:
            print(f"  💾 Dùng embedding cache ({CACHE_EMB})")
            return np.load(CACHE_EMB)

    print(f"  🔄 Tính embeddings cho {len(texts)} sản phẩm…")
    t0   = time.time()
    embs = model.encode(texts, normalize_embeddings=True, batch_size=64, show_progress_bar=True)
    print(f"  ⏱  Xong trong {time.time()-t0:.1f}s")

    np.save(CACHE_EMB, embs)
    json.dump({"key": cache_key, "model": MODEL_NAME, "n": len(texts)}, open(CACHE_META, "w"))
    print(f"  💾 Đã lưu cache → {CACHE_EMB}")
    return embs

# ─── HARD FILTER ───────────────────────────────────────────────

def hard_filter(a, b) -> bool:
    if a["brand_slug"] != b["brand_slug"]:                       return False
    if a["source"]     == b["source"]:                           return False
    if a["type"]       != b["type"]:                             return False
    if a["vol"]   and b["vol"]   and a["vol"]   != b["vol"]:     return False
    if a["count"] and b["count"] and a["count"] != b["count"]:   return False
    if a["price"] and b["price"]:
        lo, hi = min(a["price"], b["price"]), max(a["price"], b["price"])
        if hi / lo > CFG["MAX_PRICE_RATIO"]:                     return False
    return True

# ─── UNION FIND ────────────────────────────────────────────────

class UnionFind:
    def __init__(self, n):
        self.p = list(range(n))

    def find(self, x):
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px != py:
            self.p[py] = px

# ─── BUILD OUTPUT ──────────────────────────────────────────────

def build_output(pool, cluster_map):
    """
    Tạo output chuẩn DB:
      brand        → public.brand
      product      → public.product  (category_name thay vì category_id)
      listings[]   → public.product_listing + price_record lồng vào
    """
    masters = []

    for indices in cluster_map.values():
        # Dedup: mỗi source chỉ giữ 1 listing giá rẻ nhất
        by_source = {}
        for idx in indices:
            src = pool[idx]["source"]
            by_source.setdefault(src, []).append(idx)

        kept = []
        for src, idx_list in by_source.items():
            idx_list.sort(key=lambda x: pool[x]["price"] or 999_999)
            kept.append(idx_list[0])

        # Sắp theo PRIORITY để chọn representative
        kept.sort(key=lambda x: PRIORITY.index(pool[x]["source"])
                  if pool[x]["source"] in PRIORITY else 99)

        rep = pool[kept[0]]

        # Chọn description và image từ listing có nội dung nhất
        best_desc  = ""
        best_image = ""
        for idx in kept:
            p = pool[idx]
            if len(p["description"]) > len(best_desc):
                best_desc = p["description"]
            if p["image"] and not best_image:
                best_image = p["image"]

        # Tính discount_pct nếu thiếu
        def calc_discount(price, original_price, discount_pct):
            if discount_pct is not None:
                return round(float(discount_pct), 2)
            if price and original_price and original_price > 0:
                return round((original_price - price) / original_price * 100, 2)
            return None

        # Build listings
        listings = []
        for idx in kept:
            p = pool[idx]
            listings.append({
                # → public.product_listing
                "platform_name":    p["label"],
                "platform_id":      p["platform_id"],
                "url":              p["url"],
                "platform_image_url": p["image"],
                "crawl_time":       p["crawled_at"],
                "status":           "active",
                "trust_score":      1.0,
                "is_fake_promo":    False,
                "is_pinned":        False,

                # → public.price_record (lồng vào để import 1 lần)
                "price_record": {
                    "price":            int(p["price"]) if p["price"] else None,
                    "original_price":   int(p["original_price"]) if p["original_price"] else None,
                    "discount_pct":     calc_discount(p["price"], p["original_price"], p["discount_pct"]),
                    "in_stock":         p["in_stock"],
                    "is_flash_sale":    p["is_flash_sale"],
                    "promotion_label":  p["promotion_label"],
                },
            })

        masters.append({
            # → public.brand (UPSERT theo name)
            "brand": {
                "name": rep["brand"],
                "slug": make_slug(rep["brand"]),
            },

            # → public.product
            "product": {
                "name":          rep["original_name"],
                "barcode":       next((pool[i]["barcode"] for i in kept if pool[i]["barcode"]), None),
                "description":   best_desc,
                "image_url":     best_image,
                "skin_type":     None,
                "volume_ml":     rep["vol"],
                "category_name": rep["category_name"],
                "popularity_score": 0,
                "attributes": {
                    "product_type": rep["type"],
                    "count_unit":   rep["count"],
                },
            },

            # → public.product_listing + public.price_record
            "listings": listings,
        })

    # Sắp xếp: nhiều nguồn lên đầu
    masters.sort(key=lambda m: len(m["listings"]), reverse=True)
    return masters

# ─── MAIN ──────────────────────────────────────────────────────

def main():
    print("🦅 PriceHawk v5 — DB-Ready Output")
    print("=" * 55)

    print("\n📦 Loading products…")
    pool = load_pool()
    print(f"   Total: {len(pool)} sản phẩm\n")

    print(f"🤖 Loading model: {MODEL_NAME}")
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(MODEL_NAME)

    print("\n⚡ Computing embeddings…")
    embs = compute_or_load_embeddings(pool, model)
    print()

    # Group by brand
    brand_groups = {}
    for i, p in enumerate(pool):
        brand_groups.setdefault(p["brand_slug"], []).append(i)

    # Match
    print("🔗 Matching…")
    uf = UnionFind(len(pool))
    total_checked = confirmed = 0

    for indices in brand_groups.values():
        n = len(indices)
        if n < 2:
            continue

        group_embs = embs[indices]
        sim_matrix = group_embs @ group_embs.T

        for ii in range(n):
            i = indices[ii]
            for jj in range(ii + 1, n):
                j = indices[jj]

                if not hard_filter(pool[i], pool[j]):
                    continue

                total_checked += 1

                # Barcode exact match → force merge
                if (pool[i]["barcode"] and pool[j]["barcode"]
                        and pool[i]["barcode"] == pool[j]["barcode"]):
                    uf.union(i, j)
                    confirmed += 1
                    continue

                score = float(sim_matrix[ii, jj])
                if score >= CFG["COSINE_CONFIRM"]:
                    uf.union(i, j)
                    confirmed += 1

    print(f"   Checked:   {total_checked:,} cặp")
    print(f"   Confirmed: {confirmed:,} cặp match\n")

    # Build clusters
    cluster_map = {}
    for i in range(len(pool)):
        root = uf.find(i)
        cluster_map.setdefault(root, []).append(i)

    # Build output
    masters = build_output(pool, cluster_map)

    multi  = [m for m in masters if len(m["listings"]) > 1]
    single = [m for m in masters if len(m["listings"]) == 1]

    output = {
        "generated_at": datetime.now().isoformat(),
        "algorithm":    f"bge-m3-cosine-{CFG['COSINE_CONFIRM']}",
        "stats": {
            "total_pool":        len(pool),
            "pairs_checked":     total_checked,
            "pairs_confirmed":   confirmed,
            "matched_products":  len(multi),
            "unmatched_products": len(single),
            "total_clusters":    len(masters),
        },
        "products": masters,
    }

    json.dump(output, open(OUTPUT_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print("=" * 55)
    print(f"📊 Kết quả:")
    print(f"   Matched (2+ nguồn):  {len(multi)}")
    print(f"   Unmatched (1 nguồn): {len(single)}")
    print(f"   Tổng clusters:       {len(masters)}")
    print(f"\n💾 Output: {OUTPUT_FILE}")
    print("✅ Done.")


if __name__ == "__main__":
    main()