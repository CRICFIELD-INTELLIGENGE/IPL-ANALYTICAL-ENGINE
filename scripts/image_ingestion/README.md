# IPL Image Ingestion Pipeline

Production-oriented Python pipeline for collecting public IPL player metadata, downloading public player profile images, optimizing assets, indexing Getty reference metadata, and serving image mappings to the IPL Analytics Engine.

## Copyright And Source Rules

- Do not bypass authentication, paywalls, bot protections, or private APIs.
- Do not download Getty Images content. This pipeline stores only publicly visible Getty reference metadata such as captions, event text, season hints, and category tags.
- Only download image URLs that are publicly exposed in player metadata.
- Keep source attribution in `player_images.csv` and `getty_metadata.csv`.
- Review each source's current terms and robots guidance before scheduled production crawling.

## Folder Structure

Generated output defaults to:

```text
artifacts/image-ingestion/
  data/
    players_metadata.csv
    players_metadata.json
    player_images.csv
    failed_images.csv
    getty_metadata.csv
  logs/
    image_ingestion.log
  assets/
    players/
      virat_kohli/
        profile.webp
        profile_320.webp
        profile_640.webp
        profile_960.webp
    teams/
    venues/
    matches/
```

## Install

```powershell
cd scripts/image_ingestion
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Commands

Run from `scripts/image_ingestion`:

```powershell
python -m image_ingestion init-folders
python -m image_ingestion scrape-iplt20 --limit 20
python -m image_ingestion download-images --limit 20
python -m image_ingestion scrape-getty --pages 1
python -m image_ingestion build-all --limit 20 --getty-pages 1
python -m image_ingestion serve --port 8010
```

For full production output:

```powershell
python -m image_ingestion build-all --season 2025
```

Override output location:

```powershell
python -m image_ingestion --output-root C:\tmp\ipl-image-assets build-all
```

## API

Start:

```powershell
python -m image_ingestion serve --port 8010
```

Endpoints:

```text
GET  /api/player/{id}
GET  /api/player/{id}/images
GET  /api/team/{team}/images
POST /api/cache/refresh
```

`{id}` accepts either `player_id` or normalized `player_name`.

## Pipeline Phases

1. IPLT20 metadata scraper
   - Extracts `player_name`, `player_id`, `current_team`, `role`, `nationality`, `batting_style`, `bowling_style`, `player_profile_url`, `player_image_url`.
   - Writes `players_metadata.csv` and `players_metadata.json`.

2. Image downloader
   - Uses `aiohttp` with bounded concurrency, retries, public URL validation, duplicate skipping, and failed image logging.
   - Converts downloaded images to optimized `.webp`.
   - Resizes oversized images while preserving aspect ratio.

3. File organization
   - Writes player assets under `assets/players/{player_slug}/`.
   - Creates empty `teams`, `venues`, and `matches` folders for future expansion.

4. Image mapping database
   - Writes `player_images.csv` with source URL, local path, tags, dimensions, blur placeholder, and responsive variants.

5. Getty reference engine
   - Collects visible metadata only from public result pages.
   - Does not download copyrighted Getty image files.

6. Tagging engine
   - Generates tags from filenames, captions, player role, and source metadata.
   - Supported tags include `batting`, `bowling`, `celebration`, `fielding`, `crowd`, `trophy`, `captain`, and `action_shot`.

7. Frontend optimization
   - Generates `profile.webp`, responsive widths, and base64 WebP blur placeholders.
   - `player_images.csv` is CDN-ready because paths are stable and relative to the asset root.

## Scalable Storage Strategy

- Keep CSV/JSON outputs for local development and reproducible builds.
- For production, load `players_metadata.csv`, `player_images.csv`, and `getty_metadata.csv` into Postgres or DuckDB.
- Store optimized WebP assets in object storage such as S3, Cloudflare R2, or GCS.
- Preserve `image_url` and `source` fields for provenance.
- Use `local_path` as the canonical object key.

## Future CDN Recommendations

- Upload `artifacts/image-ingestion/assets` to a versioned bucket prefix, for example `ipl-assets/2025/`.
- Serve through CloudFront, Cloudflare, or another CDN with long cache TTLs.
- Keep `profile.webp` as the default `src`.
- Use `responsive_variants` for `srcset`.
- Use `blur_placeholder` for progressive frontend loading.
- Never CDN-cache restricted/private source URLs directly; cache only your optimized, legally permitted derivatives.
