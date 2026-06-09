"""YouTube API search — multi-keyword fallback strategy."""
import re
import time
from datetime import datetime, timedelta, timezone

import requests

from .config import YOUTUBE_API_KEY, YOUTUBE_SEARCH_URL

YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"


class QuotaExceededError(Exception):
    """Raised when YouTube API quota is exhausted."""


# ── Keyword normalization ─────────────────────────────────────────────────────

STOPWORDS = {
    "chính hãng", "nội địa", "mẫu mới", "mới về", "hàng nhập",
    "authentic", "genuine",
    "giá tốt", "giá rẻ", "giá sinh viên", "sale", "sale off",
    "khuyến mãi", "khuyến mại", "giảm giá", "flash sale",
    "freeship", "free ship", "miễn phí vận chuyển",
    "mua 1 tặng 1", "tặng quà", "quà tặng",
    "combo", "bộ", "set", "bundle",
    "hot", "trend", "bestseller", "best seller", "top", "nổi bật",
    "yêu thích", "hot sale", "hàng mới",
    "new", "new arrival", "limited",
}

UNIT_PATTERN = re.compile(
    r"\b(?:\d+(?:[.,]\d+)?\s*(?:g|gram|kg|ml|l|lít))\b"
    r"|\b(?:\d+\s*(?:chai|túi|tube|tuýp|vĩ|hộp|bịch))\b"
    r"|\b(?:\d+ml|\d+g)\b",
    re.IGNORECASE,
)

SPECIAL_CHARS = re.compile(r"[^\w\sÀ-ỹ]")


def normalize_name(name: str) -> str:
    """Loại bỏ stopwords, đơn vị, ký tự đặc biệt khỏi tên sản phẩm."""
    if not name:
        return ""
    n = name.lower()
    n = UNIT_PATTERN.sub(" ", n)
    for sw in STOPWORDS:
        n = re.sub(r"\b" + re.escape(sw) + r"\b", " ", n, flags=re.IGNORECASE)
    n = SPECIAL_CHARS.sub(" ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def extract_core_name(name: str) -> str:
    """Tên sản phẩm rút gọn: bỏ stopwords + đơn vị, lấy phần thực sự nhận diện sản phẩm."""
    core = normalize_name(name)
    words = core.split()
    meaningful = [w for w in words if len(w) >= 2]
    return " ".join(meaningful[:8])


def extract_short_core(name: str) -> str:
    """Lấy phần cốt lõi ngắn gọn (2-3 từ) cho keyword rộng."""
    core = normalize_name(name)
    words = core.split()
    meaningful = [w for w in words if len(w) >= 2]
    return " ".join(meaningful[:3])


def build_search_keywords(brand: str, product_name: str) -> list:
    """
    Xây dựng danh sách keyword từ chặt → rộng.
    Priority:
      1. brand + short_core + tiếng Việt (review/đánh giá/có tốt không)
      2. short_core + tiếng Việt
      3. brand + short_core
      4. short_core (2-3 words)
    """
    clean_brand = normalize_name(brand).split()[0] if brand else ""
    core = extract_core_name(product_name)
    short_core = extract_short_core(product_name)

    keywords = []

    if clean_brand and short_core:
        # ── Chặt nhất: brand + core + tiếng Việt review/đánh giá ──
        for suffix in ["review", "đánh giá", "có tốt không", "unboxing", "mở hộp"]:
            keywords.append(f"{clean_brand} {short_core} {suffix}")

        # ── Chặt: brand + core (không suffix) ──
        keywords.append(f"{clean_brand} {short_core}")

        # ── Rộng hơn: short_core + tiếng Việt ──
        for suffix in ["review", "đánh giá", "cách dùng", "sử dụng"]:
            kw = f"{short_core} {suffix}"
            if kw not in keywords:
                keywords.append(kw)

        # ── Rộng: brand đơn thuần ──
        keywords.append(f"{clean_brand} review")
        keywords.append(f"{clean_brand} đánh giá")

        # ── Rộng nhất: short_core thuần ──
        if short_core not in keywords:
            keywords.append(short_core)

    elif short_core:
        # Không có brand: dùng short_core + tiếng Việt
        for suffix in ["review", "đánh giá", "có tốt không", "unboxing"]:
            kw = f"{short_core} {suffix}"
            if kw not in keywords:
                keywords.append(kw)
        if short_core not in keywords:
            keywords.append(short_core)

    else:
        # Fallback: dùng normalize product_name
        clean_name = normalize_name(product_name)
        if clean_name:
            keywords.append(f"{clean_name} review")
            keywords.append(f"{clean_name} đánh giá")
            keywords.append(clean_name)

    return [kw.strip() for kw in keywords if kw.strip() and len(kw) >= 3]


# ── API helpers ──────────────────────────────────────────────────────────────

def _search_page(query: str, page_token: str = None) -> dict:
    """Gọi YouTube search API, trả về JSON response thô."""
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": 10,
        "key": YOUTUBE_API_KEY,
        "relevanceLanguage": "vi",
        "videoDuration": "short",
    }
    if page_token:
        params["pageToken"] = page_token

    try:
        resp = requests.get(YOUTUBE_SEARCH_URL, params=params, timeout=15)
    except requests.RequestException as e:
        print(f"[API] Network error on search '{query}': {e}")
        return {}

    if resp.status_code == 403:
        print(f"[API] 403 Forbidden on search '{query}': {resp.text}")
        return {}
    if resp.status_code == 429:
        raise QuotaExceededError("Quota exceeded for YouTube Search API")
    if resp.status_code != 200:
        print(f"[API] HTTP {resp.status_code} on search '{query}': {resp.text}")
        return {}

    return resp.json()


def _fetch_video_details(youtube_ids: list) -> dict:
    """Lấy duration, viewCount, publishDate cho danh sách youtube_id."""
    if not youtube_ids:
        return {}
    ids_str = ",".join(youtube_ids)
    params = {
        "part": "contentDetails,statistics,snippet",
        "id": ids_str,
        "key": YOUTUBE_API_KEY,
    }
    try:
        resp = requests.get(YOUTUBE_VIDEOS_URL, params=params, timeout=15)
        if resp.status_code != 200:
            return {}
        details = {}
        for item in resp.json().get("items", []):
            vid = item["id"]
            content = item.get("contentDetails", {})
            stats = item.get("statistics", {})
            snippet = item.get("snippet", {})
            details[vid] = {
                "duration": _parse_duration(content.get("duration", "")),
                "view_count": int(stats.get("viewCount", 0) or 0),
                "published_at": snippet.get("publishedAt", ""),
                "channel_title": snippet.get("channelTitle", ""),
            }
        return details
    except Exception as e:
        print(f"[API] Failed to fetch video details: {e}")
        return {}


def _parse_duration(iso: str) -> int:
    m = re.search(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso)
    if not m:
        return 0
    h, mn, s = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mn * 60 + s


# ── Video scoring ────────────────────────────────────────────────────────────

def score_video(
    video: dict,
    core_words: list,
    short_core: str,
    brand_word: str,
    fetched_at: datetime,
) -> float:
    """
    Tính relevance score cho một video dựa trên:
      - Title chứa core product name: +40
      - Title chứa brand: +20
      - Từ khóa review/đánh giá/unboxing: +15
      - Từ khóa tiếng Việt: +10
      - Recency bonus: video mới (< 6 tháng): +15, < 1 năm: +8
      - View count bonus (log scale): +0-15
      - Shorts ≤ 60s: +5
    Trả về score float.
    """
    score = 0.0
    title_lower = video.get("title", "").lower()

    # ── Title match ──
    for word in core_words:
        if len(word) >= 3 and word in title_lower:
            score += 8

    # ── Short core match ──
    if short_core and len(short_core) >= 3 and short_core in title_lower:
        score += 20

    # ── Brand match ──
    if brand_word and len(brand_word) >= 2 and brand_word in title_lower:
        score += 15

    # ── Keyword quality signals in title ──
    quality_signals = [
        ("review", 8), ("đánh giá", 8), ("unboxing", 6),
        ("mở hộp", 5), ("cách dùng", 5), ("sử dụng", 3),
        ("có tốt không", 6), ("trải nghiệm", 4),
        ("test", 3), ("demo", 3), ("top", 2),
    ]
    for signal, pts in quality_signals:
        if signal in title_lower:
            score += pts
            break  # max 1 keyword bonus

    # ── Anti-quality signals (ads, promotional) ──
    bad_signals = [
        "quảng cáo", "ads", "advertisement", "sponsored",
        "mua ngay", "shopee", "lazada", "tiki",
        "link bio", "shop link", "mua hàng",
    ]
    for signal in bad_signals:
        if signal in title_lower:
            score -= 10
            break

    # ── Recency bonus ──
    pub_str = video.get("published_at", "")
    if pub_str:
        try:
            pub_date = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))
            age_days = (fetched_at - pub_date).days
            if 0 <= age_days < 180:
                score += 12
            elif 180 <= age_days < 365:
                score += 6
            elif 365 <= age_days < 730:
                score += 2
            elif age_days > 1825:
                score -= 5
        except (ValueError, OSError):
            pass

    # ── View count bonus ──
    views = video.get("view_count", 0)
    if views > 0:
        import math
        score += min(10, math.log10(views + 1) * 1.5)

    # ── Shorts duration bonus ──
    dur = video.get("duration", 0)
    if dur > 0 and dur <= 60:
        score += 3

    return score


# ── Main search function ─────────────────────────────────────────────────────

def search_youtube_shorts(
    product_name: str,
    brand_name: str,
    already_seen_ids: set = None,
    max_videos: int = 4,
) -> list:
    """
    Tìm video YouTube Shorts cho sản phẩm.
    - Thử nhiều keyword từ chặt → rộng.
    - Bỏ qua video đã thấy trong run hiện tại và trong DB.
    - KHÔNG filter duration ở API; filter + score sau khi lấy kết quả.
    - Trả về danh sách video đã được sắp xếp theo relevance score.
    """
    if already_seen_ids is None:
        already_seen_ids = set()

    keywords = build_search_keywords(brand_name, product_name)
    if not keywords:
        return []

    core_words = extract_core_name(product_name).split()
    short_core = extract_short_core(product_name)
    brand_word = normalize_name(brand_name).split()[0] if brand_name else ""
    fetched_at = datetime.utcnow().replace(tzinfo=timezone.utc)

    all_found_ids: set = set()
    results: list = []

    for kw in keywords:
        if len(results) >= max_videos * 3:
            break

        page_token = None

        for _ in range(2):
            data = _search_page(kw, page_token)
            items = data.get("items", [])
            if not items:
                break

            for item in items:
                vid_info = item.get("id", {})
                if vid_info.get("kind") != "youtube#video":
                    continue
                yid = vid_info.get("videoId", "")
                if not yid or yid in all_found_ids or yid in already_seen_ids:
                    continue
                all_found_ids.add(yid)

                snippet = item.get("snippet", {})
                title = snippet.get("title", "")
                thumb = (
                    snippet.get("thumbnails", {})
                    .get("medium", {})
                    .get("url")
                ) or ""
                pub_at = snippet.get("publishedAt", "")

                results.append({
                    "youtube_id": yid,
                    "title": title,
                    "thumbnail_url": thumb,
                    "video_url": f"https://www.youtube.com/embed/{yid}",
                    "published_at": pub_at,
                    "view_count": 0,
                    "duration": 0,
                })

            page_token = data.get("nextPageToken")
            if not page_token:
                break

    if not results:
        return []

    # ── Fetch details (duration, views, publish date) ──
    ids = [v["youtube_id"] for v in results]
    details = _fetch_video_details(ids)

    for v in results:
        detail = details.get(v["youtube_id"], {})
        v["duration"] = detail.get("duration", 0)
        v["view_count"] = detail.get("view_count", 0)
        v["published_at"] = detail.get("published_at", v["published_at"])

    # ── Score and filter ──
    scored = []
    for v in results:
        # Loại bỏ video quá dài (> 90s) ngay
        if v["duration"] > 90:
            continue

        s = score_video(v, core_words, short_core, brand_word, fetched_at)
        v["score"] = s
        scored.append(v)

    # Sort descending by score
    scored.sort(key=lambda x: x["score"], reverse=True)

    return scored[:max_videos]
