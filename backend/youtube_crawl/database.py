"""Database helpers for the YouTube crawler."""
import re
import uuid
from datetime import datetime, timedelta

import psycopg2

from .config import DB_CONFIG, log

# ── Connection ────────────────────────────────────────────────────────────────

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)


# ── Name normalization (shared logic, matches youtube_api.py) ─────────────────

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


def get_base_name(name: str) -> str:
    """Trả về tên sản phẩm đã làm sạch: bỏ stopwords, đơn vị, ký tự đặc biệt."""
    if not name:
        return ""
    n = name.lower()
    n = UNIT_PATTERN.sub(" ", n)
    for sw in STOPWORDS:
        n = re.sub(r"\b" + re.escape(sw) + r"\b", " ", n, flags=re.IGNORECASE)
    n = SPECIAL_CHARS.sub(" ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


# ── Product queries ──────────────────────────────────────────────────────────

def get_all_products(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT p.id, p.name, b.name AS brand_name
            FROM product p
            JOIN brand b ON p.brand_id = b.id
            WHERE p.name IS NOT NULL
              AND p.name != ''
              AND p.is_active = TRUE
              AND LENGTH(TRIM(p.name)) > 3
            ORDER BY p.popularity_score DESC NULLS LAST
        """)
        return cur.fetchall()


def get_crawl_candidates(conn, max_video_count: int = 4,
                         crawl_cooldown_hours: int = 24) -> list:
    cooldown = datetime.now() - timedelta(hours=crawl_cooldown_hours)

    with conn.cursor() as cur:
        cur.execute("""
            SELECT
                p.id,
                p.name,
                b.name AS brand_name,
                COALESCE(pv.video_count, 0) AS video_count
            FROM product p
            JOIN brand b ON p.brand_id = b.id
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS video_count
                FROM product_video_mapping pvm
                WHERE pvm.product_id = p.id
            ) pv ON TRUE
            WHERE
                p.name IS NOT NULL
                AND p.name != ''
                AND p.is_active = TRUE
                AND LENGTH(TRIM(p.name)) > 3
                AND COALESCE(pv.video_count, 0) < %(max_videos)s
                AND (
                    COALESCE(p.no_video_found, FALSE) = FALSE
                    OR p.last_crawled_at IS NULL
                    OR p.last_crawled_at < %(cooldown)s::timestamp
                )
            ORDER BY
                COALESCE(pv.video_count, 0) ASC,
                p.popularity_score DESC NULLS LAST
        """, {"max_videos": max_video_count + 1, "cooldown": cooldown})
        return cur.fetchall()


def get_video_count_for_product(conn, product_id: str) -> int:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*)
            FROM product_video_mapping
            WHERE product_id = %s
        """, (product_id,))
        return cur.fetchone()[0]


def video_exists_for_product(conn, product_id: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT EXISTS(
                SELECT 1 FROM product_video_mapping WHERE product_id = %s
            )
        """, (product_id,))
        return cur.fetchone()[0]


def get_existing_video_ids(conn) -> set:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT youtube_id FROM product_video
            WHERE youtube_id IS NOT NULL AND youtube_id != ''
        """)
        return {row[0] for row in cur.fetchall()}


def find_shared_video_ids(conn, product_id: str) -> set:
    """
    Tìm các YouTube ID đã có trong DB cho sản phẩm cùng tên, chỉ khác khối lượng.
    Ví dụ: 'Kem A 20g' và 'Kem A 40g' dùng chung video.
    """
    with conn.cursor() as cur:
        cur.execute("""
            SELECT p.name, b.name AS brand_name
            FROM product p
            JOIN brand b ON p.brand_id = b.id
            WHERE p.id = %(pid)s
        """, {"pid": product_id})
        row = cur.fetchone()
        if not row:
            return set()
        prod_name, brand_name = row[0], row[1]
        if not prod_name:
            return set()

        # Tính base name đã làm sạch
        base = get_base_name(prod_name)

        if not base or len(base) < 3:
            return set()

        # Tìm sản phẩm cùng brand, base name trùng, khác product_id
        cur.execute("""
            SELECT DISTINCT pv.youtube_id
            FROM product_video pv
            JOIN product_video_mapping pvm ON pv.id = pvm.video_id
            JOIN product p2 ON pvm.product_id = p2.id
            JOIN brand b2 ON p2.brand_id = b2.id
            WHERE p2.id != %(pid)s
              AND b2.name ILIKE %(brand)s
              AND LOWER(p2.name) LIKE ('%%' || %(core)s || '%%')
              AND pv.youtube_id IS NOT NULL AND pv.youtube_id != ''
        """, {"pid": product_id, "brand": brand_name, "core": base})
        return {row[0] for row in cur.fetchall()}


# ── Write operations ─────────────────────────────────────────────────────────

def mark_crawl_success(conn, product_id: str):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE product
            SET last_crawled_at = %s,
                no_video_found   = FALSE
            WHERE id = %s
        """, (datetime.now(), product_id))
    conn.commit()


def mark_no_video_found(conn, product_id: str):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE product
            SET last_crawled_at = %s,
                no_video_found   = TRUE
            WHERE id = %s
        """, (datetime.now(), product_id))
    conn.commit()


def insert_video(conn, video_data: dict, product_id: str):
    video_id = str(uuid.uuid4())
    youtube_id = video_data["youtube_id"]
    title = video_data["title"]
    thumbnail_url = video_data["thumbnail_url"]
    video_url = video_data["video_url"]
    duration = video_data.get("duration", 0)

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO product_video
                (id, youtube_id, title, video_url, thumbnail_url, duration, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING id
        """, (video_id, youtube_id, title, video_url, thumbnail_url, duration, datetime.now()))

        row = cur.fetchone()
        if row is None:
            log.warning(
                "Video %s already exists (conflict), skipping mapping", youtube_id
            )
            return

        actual_video_id = row[0]

        cur.execute("""
            INSERT INTO product_video_mapping (id, video_id, product_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (video_id, product_id) DO NOTHING
        """, (str(uuid.uuid4()), actual_video_id, product_id))

    conn.commit()
    log.info(
        "Inserted video youtube_id=%s for product_id=%s (title: %s..., duration: %ds)",
        youtube_id, product_id, title[:60], duration
    )


def delete_all_videos(conn):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM product_video_mapping")
        cur.execute("DELETE FROM product_video")
    conn.commit()
    log.info("Deleted all videos and mappings")


# ── Crawl Job tracking ────────────────────────────────────────────────────────

def create_crawl_job(conn) -> str:
    """Tạo một crawl job record mới, trả về job_id."""
    job_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO crawl_job (id, started_at, status)
            VALUES (%s, %s, 'RUNNING')
            RETURNING id
        """, (job_id, datetime.now()))
    conn.commit()
    return job_id


def update_crawl_job(conn, job_id: str,
                     processed_count: int,
                     inserted_count: int,
                     error_count: int,
                     quota_exceeded: bool = False):
    """Cập nhật stats cuối cho crawl job."""
    status = "QUOTA_EXCEEDED" if quota_exceeded else "COMPLETED"
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE crawl_job
            SET finished_at   = %s,
                status        = %s,
                processed_count = %s,
                inserted_count  = %s,
                error_count     = %s
            WHERE id = %s
        """, (datetime.now(), status, processed_count, inserted_count, error_count, job_id))
    conn.commit()
