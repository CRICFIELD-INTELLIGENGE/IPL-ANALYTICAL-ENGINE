# 🏏 IPL Cricket Image Ingestion & Optimization Pipeline

A production-grade, highly resilient, and modular Python-based pipeline built to safely collect, process, optimize, tag, and serve IPL cricket player assets and metadata.

## 🏗️ Project Architecture & File Structure

The pipeline is designed around **Clean Architecture Principles**, separating settings, file-system structures, media processing, metadata indexing, and API delivery:

```text
/artifacts/image-ingestion/
├── requirements.txt            # Python dependencies (Pillow, bs4, FastAPI, aiohttp)
├── run_pipeline.py             # Master orchestrator executing Phase 1 through 8
├── api.py                      # FastAPI REST application serving assets & JSON metadata
├── data/
│   ├── players_metadata.json   # Scraped/seeded player profile records
│   ├── players_metadata.csv    # Tabular player attributes list
│   ├── getty_metadata.csv      # Safe, non-copyrighted Getty event references
│   └── player_images.csv       # Ingestion mappings (local path, tags, source)
├── logs/
│   ├── pipeline.log            # Execution tracer
│   └── failed_downloads.log    # Retried and failed asset URLs
├── assets/                     # Clean organized folders
│   ├── players/
│   │   └── virat_kohli/
│   │       ├── profile.webp
│   │       ├── profile_thumbnail.webp
│   │       └── profile_medium.webp
│   ├── teams/
│   ├── venues/
│   └── matches/
└── src/
    ├── __init__.py
    ├── config.py               # Image quality, paths, and size thresholds
    ├── utils.py                # Console logger and name sanitizers
    ├── scraper.py              # Phase 1: iplt20.com BeautifulSoup parser
    ├── downloader.py           # Phase 2: Asynchronous download pool (aiohttp)
    ├── organizer.py            # Phase 3: Directory creation helper
    ├── database.py             # Phase 4: CSV registration mapper
    ├── getty_engine.py         # Phase 5: Copyright-compliant Getty references
    ├── tagging.py              # Phase 6: Filename & metadata tagger
    ├── api_service.py          # Phase 7: Roster search and API handlers
    └── optimization.py         # Phase 8: Blur placeholders & responsive sizes
```

---

## 🚀 Execution & Quick Start Guide

### 1. Install Dependencies
Make sure you have Python 3.8+ installed on your Windows system, then run:
```bash
pip install -r requirements.txt
```

### 2. Run Ingestion Pipeline
To scrape players, download profile images concurrently, downscale to responsive sizes, tag them, and build blur placeholders:
```bash
python run_pipeline.py
```

### 3. Run FastAPI Image API
To start the high-performance local image delivery and query API server:
```bash
python api.py
```
* Once running, visit the interactive Swagger UI documentation at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 💎 Advanced Feature Breakdown

### 📸 Phase 2 & 8: High-Performance Image Optimization
- **WebP Encoding**: Automatic color-space conversion (handling `RGBA` to `RGB` white-mask conversion for transparency) and compression to optimized WebP at `82` quality.
- **Responsive Multi-scaling**: Every profile portrait automatically outputs three sizes:
  - `Thumbnail`: 150px × 150px
  - `Medium`: 500px × 500px
  - `Large`: 1200px × 800px
- **Base64 Blur Placeholders**: Generates a 10px × 10px ultra-low-resolution blurred WebP data URI. The frontend uses this tiny string to display an elegant preview while the full image loads lazily.

### 🛡️ Phase 5: Safe Getty Images Reference Engine
- **Non-Copyright Violative**: Extracts text-only metadata, alt descriptions, captions, matching athlete names, and event categories without fetching or storing copyrighted binaries.
- **Searchable Index**: Saves references into `getty_metadata.csv` to map actions to live cricket events dynamically.

### 🏷️ Phase 6: Semantic Tagging
- **Rule-based Labels**: Analyzes filename structure, player role (Batter vs Bowler), and descriptions using regex mappings to tag files with categories like `batting`, `bowling`, `celebration`, `captain`, `action_shot`.

---

## 🌐 API Endpoint Specifications

| Endpoint | Method | Response Description |
| :--- | :--- | :--- |
| `/api/status` | `GET` | Pipeline health details and asset index counts |
| `/api/player/{id}` | `GET` | General profile, batting/bowling styles, nationality, and current team |
| `/api/player/{id}/images` | `GET` | List of local WebP sizes, tags, source sites, and Base64 blur previews |
| `/api/team/{team}/images` | `GET` | Roster image mapping feed for a specific franchise team |

---

## ☁️ Production Hosting & CDN Recommendations

For high-scale production systems with global cricket audiences, migrate local disk storage to a cloud CDN:

1. **Object Storage**: Upload the `/assets` folder structure to an **Amazon S3 Bucket** or **Google Cloud Storage (GCS)**.
2. **Cloudfront or Fastly CDN**: Deploy a **CDN Cache Layer** (e.g., AWS CloudFront, Cloudflare, Fastly) in front of the bucket.
3. **URL Mapping**: Update `player_images.csv` `local_path` mapping values to absolute CDN URLs:
   - `https://cdn.ipl-analytics.com/players/virat_kohli/profile.webp`
4. **On-the-Fly Optimization**: Integrate real-time image optimization proxies like **Cloudinary** or **imgix** to request dynamic crops on-demand (e.g., adding `?width=300&format=webp` directly to client source tags).
