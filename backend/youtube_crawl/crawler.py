"""Main crawling logic for the YouTube crawler."""
import time

from .config import (
    CRAWL_COOLDOWN_HOURS,
    MAX_VIDEOS_BEFORE_SKIP,
    MAX_VIDEOS_PER_PRODUCT,
    REQUEST_DELAY_SECONDS,
    log,
)
from .database import (
    find_shared_video_ids,
    get_crawl_candidates,
    get_db_connection,
    get_existing_video_ids,
    insert_video,
    mark_crawl_success,
)
from .youtube_api import QuotaExceededError, build_search_keywords, normalize_name, search_youtube_shorts


def crawl_all(conn, skip_existing: bool = True, dry_run: bool = False):
    log.info("=" * 60)
    log.info(
        "YouTube Crawl — Starting  "
        "(skip_existing=%s, dry_run=%s, max_videos=%d, cooldown_h=%d)",
        skip_existing, dry_run, MAX_VIDEOS_PER_PRODUCT, CRAWL_COOLDOWN_HOURS
    )
    log.info("=" * 60)

    # ── 1. Lấy sản phẩm active ──
    if skip_existing:
        products = get_crawl_candidates(
            conn,
            max_video_count=MAX_VIDEOS_PER_PRODUCT,
            crawl_cooldown_hours=CRAWL_COOLDOWN_HOURS,
        )
        log.info("Found %d crawl candidates", len(products))
    else:
        from .database import get_all_products
        products = get_all_products(conn)
        log.info("Crawling all %d products (skip_existing=False)", len(products))

    if not products:
        log.info("No products to process. Exiting.")
        return

    processed = 0
    videos_inserted = 0
    skipped_existing = 0
    skipped_duplicate = 0
    skipped_no_match = 0
    errors = 0
    quota_exceeded = False

    existing_yt_ids = get_existing_video_ids(conn)
    log.info("Already have %d YouTube IDs in DB", len(existing_yt_ids))

    for i, row in enumerate(products, 1):
        if len(row) == 4:
            product_id, product_name, brand_name, video_count = row
        else:
            product_id, product_name, brand_name = row
            video_count = 0

        # ── 2. Bỏ qua sản phẩm đã có >= 4 video ──
        if video_count >= MAX_VIDEOS_PER_PRODUCT:
            log.info("[%d/%d] %s — already has %d videos, skipping",
                     i, len(products), product_name[:60], video_count)
            skipped_existing += 1
            processed += 1
            continue

        # ── 3. Normalize tên sản phẩm ──
        normalized_name = normalize_name(product_name)
        display_brand = brand_name or "(no brand)"
        kw_list = build_search_keywords(brand_name, product_name)
        kw_preview = " | ".join(kw_list[:4])
        if len(kw_list) > 4:
            kw_preview += f" ... (+{len(kw_list) - 4} more)"

        log.info(
            "[%d/%d] %s | %s | normalized: %s | current videos: %d | keywords: %s",
            i, len(products), product_name[:60], display_brand,
            normalized_name[:60], video_count, kw_preview
        )

        shared_ids = find_shared_video_ids(conn, str(product_id))
        already_seen_ids = existing_yt_ids | shared_ids
        if shared_ids:
            log.info(
                "  -> Related size variants already have %d video IDs",
                len(shared_ids)
            )

        # ── 5. Gọi YouTube search.list ──
        try:
            videos = search_youtube_shorts(
                product_name,
                brand_name,
                already_seen_ids=already_seen_ids,
                max_videos=MAX_VIDEOS_PER_PRODUCT,
            )
        except QuotaExceededError:
            log.warning("=" * 60)
            log.warning(
                "QUOTA_EXCEEDED — Crawler stopped. "
                "Products will NOT be marked NO_VIDEO_FOUND."
            )
            log.warning("Resume later (quota resets daily).")
            log.warning("=" * 60)
            quota_exceeded = True
            break

        # ── 7. Không đánh dấu no video vĩnh viễn — không gọi mark_no_video_found ──
        if not videos:
            log.info(
                "  -> No matching videos after trying %d keywords (NOT marking NO_VIDEO_FOUND)",
                len(kw_list)
            )
            skipped_no_match += 1
        else:
            log.info(
                "  -> Found %d videos (target: up to %d)",
                len(videos), MAX_VIDEOS_PER_PRODUCT
            )

            # ── 8. Lọc trùng youtubeId rồi lưu ──
            for vd in videos:
                if vd["youtube_id"] in existing_yt_ids:
                    log.info(
                        "  -> YouTube ID %s already in DB, skipping",
                        vd["youtube_id"]
                    )
                    skipped_duplicate += 1
                    continue

                score = vd.get("score", 0)
                if dry_run:
                    log.info(
                        "  [DRY] Insert: score=%.1f | youtube_id=%s | title=%s | url=%s",
                        score, vd["youtube_id"], vd["title"][:60], vd["video_url"]
                    )
                else:
                    try:
                        insert_video(conn, vd, str(product_id))
                        existing_yt_ids.add(vd["youtube_id"])
                        videos_inserted += 1
                        log.info(
                            "  -> Inserted video score=%.1f: %s",
                            score, vd["title"][:60]
                        )
                    except Exception as e:
                        log.error("  Failed to insert video %s: %s",
                                  vd["youtube_id"], e)
                        errors += 1

            if not dry_run:
                mark_crawl_success(conn, str(product_id))

        processed += 1

        if i % 20 == 0:
            log.info(
                "Progress: %d/%d | inserted: %d | "
                "no_match: %d | dup: %d | errors: %d",
                i, len(products), videos_inserted,
                skipped_no_match, skipped_duplicate, errors
            )

        time.sleep(REQUEST_DELAY_SECONDS)

    log.info("=" * 60)
    if quota_exceeded:
        log.info("Crawl STOPPED — QUOTA_EXCEEDED")
        log.info("Videos inserted so far: %d", videos_inserted)
        log.info("Products processed before quota hit: %d/%d",
                 processed, len(products))
    else:
        log.info("Crawl complete!")
    log.info("  Processed:          %d", processed)
    log.info("  Videos inserted:     %d", videos_inserted)
    log.info("  No match (no mark): %d", skipped_no_match)
    log.info("  Skipped (existing): %d", skipped_existing)
    log.info("  Skipped (dup):      %d", skipped_duplicate)
    log.info("  Errors:             %d", errors)
    log.info("=" * 60)


def crawl_from_json(json_path: str, dry_run: bool = False):
    import json
    log.info("Loading products from JSON: %s", json_path)
    with open(json_path, "r", encoding="utf-8") as f:
        products = json.load(f)

    if not products:
        log.error("No products found in JSON file: %s", json_path)
        return

    log.info("Loaded %d products from JSON", len(products))

    try:
        conn = get_db_connection()
        log.info("Connected to database successfully")
    except Exception as e:
        log.error("Failed to connect to database: %s", e)
        return

    processed = 0
    videos_inserted = 0
    skipped_duplicate = 0
    skipped_no_match = 0
    errors = 0
    quota_exceeded = False

    existing_yt_ids = get_existing_video_ids(conn)
    log.info("Already have %d YouTube IDs in DB", len(existing_yt_ids))

    for i, prod in enumerate(products, 1):
        product_id = prod.get("id")
        product_name = prod.get("name", "")
        brand_name = prod.get("brand_name", "")

        if not product_name or len(product_name.strip()) <= 3:
            log.warning(
                "[%d/%d] Product name too short, skipping: %s",
                i, len(products), product_name[:60]
            )
            continue

        normalized_name = normalize_name(product_name)
        kw_list = build_search_keywords(brand_name, product_name)
        display_brand = brand_name or "(no brand)"
        log.info(
            "[%d/%d] %s | %s | normalized: %s | keywords: %s",
            i, len(products), product_name[:60], display_brand,
            normalized_name[:60], " | ".join(kw_list[:3])
        )

        try:
            videos = search_youtube_shorts(
                product_name, brand_name,
                already_seen_ids=set(),
                max_videos=MAX_VIDEOS_PER_PRODUCT,
            )
        except QuotaExceededError:
            log.warning("QUOTA_EXCEEDED during JSON crawl. Stopping.")
            quota_exceeded = True
            break

        if not videos:
            log.info("  -> No matching videos")
            skipped_no_match += 1
        else:
            log.info("  -> Found %d videos", len(videos))
            for vd in videos:
                if vd["youtube_id"] in existing_yt_ids:
                    log.info(
                        "  -> YouTube ID %s already in DB, skipping",
                        vd["youtube_id"]
                    )
                    skipped_duplicate += 1
                    continue

                if dry_run:
                    log.info(
                        "  [DRY] Insert: youtube_id=%s | title=%s",
                        vd["youtube_id"], vd["title"][:60]
                    )
                else:
                    try:
                        insert_video(conn, vd, str(product_id))
                        existing_yt_ids.add(vd["youtube_id"])
                        videos_inserted += 1
                    except Exception as e:
                        log.error("  Failed to insert video %s: %s",
                                  vd["youtube_id"], e)
                        errors += 1

        processed += 1

        if i % 20 == 0:
            log.info(
                "Progress: %d/%d | inserted: %d | "
                "no_match: %d | dup: %d | errors: %d",
                i, len(products), videos_inserted,
                skipped_no_match, skipped_duplicate, errors
            )

        time.sleep(REQUEST_DELAY_SECONDS)

    log.info("=" * 60)
    log.info("JSON crawl complete!")
    log.info("  Processed:        %d", processed)
    log.info("  Videos inserted:   %d", videos_inserted)
    log.info("  No match:         %d", skipped_no_match)
    log.info("  Skipped (dup):    %d", skipped_duplicate)
    log.info("  Errors:           %d", errors)
    log.info("=" * 60)

    conn.close()


def export_products_to_json(output_path: str = "products_export.json"):
    log.info("Exporting products to JSON: %s", output_path)
    try:
        conn = get_db_connection()
    except Exception as e:
        log.error("Failed to connect to database: %s", e)
        return

    from .database import get_all_products
    products = get_all_products(conn)
    conn.close()

    data = [
        {"id": str(pid), "name": pname, "brand_name": bname}
        for pid, pname, bname in products
    ]

    with open(output_path, "w", encoding="utf-8") as f:
        import json
        json.dump(data, f, ensure_ascii=False, indent=2)

    log.info("Exported %d products to %s", len(data), output_path)
