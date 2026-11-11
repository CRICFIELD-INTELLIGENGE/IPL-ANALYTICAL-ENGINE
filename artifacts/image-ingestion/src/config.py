import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
ASSETS_DIR = BASE_DIR / "assets"
LOGS_DIR = BASE_DIR / "logs"

# Ensure crucial directories exist
for directory in [DATA_DIR, ASSETS_DIR, LOGS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Image Optimization Settings
WEBP_QUALITY = 82
MAX_PROFILE_SIZE = (500, 500)  # Profile portrait bounding box
MAX_ACTION_SIZE = (1200, 800)  # Action shot bounding box
IMAGE_SIZES = {
    "thumbnail": (150, 150),
    "medium": (500, 500),
    "large": (1200, 800)
}

# Scraper Settings
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9"
}

# Request throttle and retries
DOWNLOAD_RETRIES = 3
DOWNLOAD_DELAY = 1.0
CONCURRENT_DOWNLOAD_LIMIT = 5

# Files
METADATA_CSV = DATA_DIR / "players_metadata.csv"
METADATA_JSON = DATA_DIR / "players_metadata.json"
GETTY_METADATA_CSV = DATA_DIR / "getty_metadata.csv"
IMAGE_MAPPING_CSV = DATA_DIR / "player_images.csv"
FAILED_LOG = LOGS_DIR / "failed_downloads.log"
PIPELINE_LOG = LOGS_DIR / "pipeline.log"
