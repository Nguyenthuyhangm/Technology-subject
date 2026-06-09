"""CLI entrypoint for the YouTube crawler."""
import argparse
import os
import sys

from .config import MAX_VIDEOS_PER_PRODUCT, REQUEST_DELAY_SECONDS, YOUTUBE_API_KEY, log
from .crawler import crawl_all, crawl_from_json, export_products_to_json
from .database import delete_all_videos, get_db_connection


def main():
    parser = argparse.ArgumentParser(
        description="YouTube Video Crawler — crawl short video reviews for products",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Crawl all products that don't have videos yet (from DB)
  python -m youtube_crawl --mode db

  # Crawl all products from DB, replacing existing videos
  python -m youtube_crawl --mode db --no-skip-existing

  # Dry run — show what would be done without inserting
  python -m youtube_crawl --mode db --dry-run

  # Use products from a JSON file (useful for testing)
  python -m youtube_crawl --mode json --json-file my_products.json

  # Export products to JSON for inspection
  python -m youtube_crawl --mode export

  # Use a different YouTube API key
  YOUTUBE_API_KEY=your_key python -m youtube_crawl --mode db
        """
    )

    parser.add_argument(
        "--mode", choices=["db", "json", "export"],
        default="db",
        help="'db' = crawl from database (default); 'json' = crawl from JSON file; 'export' = export products to JSON"
    )
    parser.add_argument(
        "--json-file",
        default="products_export.json",
        help="Path to JSON file (for --mode json) or output path (for --mode export)"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete ALL existing videos before crawling (use this to start fresh)"
    )
    parser.add_argument(
        "--no-skip-existing",
        action="store_true",
        help="Process ALL products, not just those without videos"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without inserting into DB"
    )
    parser.add_argument(
        "--max-videos",
        type=int,
        default=MAX_VIDEOS_PER_PRODUCT,
        help=f"Maximum videos per product (default: {MAX_VIDEOS_PER_PRODUCT})"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=REQUEST_DELAY_SECONDS,
        help=f"Delay between API calls in seconds (default: {REQUEST_DELAY_SECONDS})"
    )
    parser.add_argument(
        "--api-key",
        default=YOUTUBE_API_KEY,
        help=f"YouTube Data API v3 key (default: env YOUTUBE_API_KEY)"
    )

    args = parser.parse_args()

    import youtube_crawl.config as cfg
    cfg.MAX_VIDEOS_PER_PRODUCT = args.max_videos
    cfg.REQUEST_DELAY_SECONDS = args.delay
    cfg.YOUTUBE_API_KEY = args.api_key

    if not args.api_key:
        log.error("No YouTube API key provided. Set YOUTUBE_API_KEY env variable or --api-key flag.")
        sys.exit(1)

    log.info("YouTube API Key: %s...%s", args.api_key[:8], "***")

    if args.mode == "export":
        export_products_to_json(args.json_file)
        return

    if args.mode == "json":
        if not os.path.exists(args.json_file):
            log.error("JSON file not found: %s", args.json_file)
            sys.exit(1)
        crawl_from_json(args.json_file, dry_run=args.dry_run)
        return

    try:
        conn = get_db_connection()
        log.info("Connected to database successfully")
    except Exception as e:
        log.error("Failed to connect to database: %s", e)
        sys.exit(1)

    try:
        if args.reset:
            delete_all_videos(conn)

        crawl_all(
            conn,
            skip_existing=not args.no_skip_existing,
            dry_run=args.dry_run,
        )
    finally:
        conn.close()
        log.info("Database connection closed")


if __name__ == "__main__":
    main()
