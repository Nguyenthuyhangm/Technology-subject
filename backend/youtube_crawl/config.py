"""Configuration constants and logging setup for the YouTube crawler."""
import io
import logging
import sys

# ── Database ─────────────────────────────────────────────────────────────────

DB_CONFIG = {
    "host": "aws-1-ap-northeast-2.pooler.supabase.com",
    "port": 5432,
    "dbname": "postgres",
    "user": "postgres.astkanfsacxriwprspqr",
    "password": "PriceHawl123@",
    "sslmode": "require",
}

# ── YouTube API ───────────────────────────────────────────────────────────────

YOUTUBE_API_KEY = "AIzaSyBmUeTjqE1CQQOTNcgt6B7vuXA_diFVGuk"

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

# ── Crawling parameters ────────────────────────────────────────────────────────

MAX_VIDEOS_PER_PRODUCT = 4
REQUEST_DELAY_SECONDS = 0.3
BATCH_COMMIT = 20
CRAWL_COOLDOWN_HOURS = 24
MAX_VIDEOS_BEFORE_SKIP = 4
MIN_PRODUCT_NAME_LENGTH = 3
LOG_FILE = "youtube_crawler.log"

# ── Logging ───────────────────────────────────────────────────────────────────

class Utf8StreamHandler(logging.StreamHandler):
    def __init__(self, stream=None):
        super().__init__(stream)
        try:
            import io
            if hasattr(stream, 'reconfigure'):
                self.stream.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass

    def emit(self, record):
        try:
            msg = self.format(record)
            stream = self.stream
            try:
                stream.write(msg + self.terminator)
            except (TypeError, io.UnsupportedOperation):
                stream.write((msg + self.terminator).encode('utf-8', errors='replace').decode('utf-8', errors='replace'))
            self.flush()
        except Exception:
            self.handleError(record)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        Utf8StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# Fix UnicodeEncodeError on Windows console
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
except Exception:
    pass
