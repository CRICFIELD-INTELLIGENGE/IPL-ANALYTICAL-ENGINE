from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from .config import PipelineConfig
from .logging_config import configure_logging

DEFAULT_GETTY_URL = "https://www.gettyimages.in/photos/ipl-cricket"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="IPL Analytics image ingestion pipeline")
    parser.add_argument("--output-root", help="Output root. Defaults to artifacts/image-ingestion.")
    parser.add_argument("--season", default="2025", help="Season label used in image mappings.")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging.")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init-folders", help="Create production asset/data/log folders.")

    scrape = sub.add_parser("scrape-iplt20", help="Scrape public IPLT20 player metadata.")
    scrape.add_argument("--limit", type=int, help="Optional player limit for smoke tests.")

    download = sub.add_parser("download-images", help="Download and optimize public player profile images.")
    download.add_argument("--metadata", type=Path, help="Path to players_metadata.csv. Defaults to generated data file.")
    download.add_argument("--limit", type=int, help="Optional player limit for smoke tests.")
    download.add_argument("--dry-run", action="store_true", help="Build mappings without downloading.")

    getty = sub.add_parser("scrape-getty", help="Collect public Getty reference metadata only.")
    getty.add_argument("--pages", type=int, default=1, help="Number of Getty result pages.")
    getty.add_argument("--url", default=DEFAULT_GETTY_URL, help="Getty public search URL.")

    build = sub.add_parser("build-all", help="Run IPLT20 metadata, image download, and Getty metadata phases.")
    build.add_argument("--limit", type=int, help="Optional player limit for smoke tests.")
    build.add_argument("--getty-pages", type=int, default=1)
    build.add_argument("--skip-getty", action="store_true")
    build.add_argument("--dry-run", action="store_true")

    serve = sub.add_parser("serve", help="Serve FastAPI image metadata API.")
    serve.add_argument("--host", default="0.0.0.0")
    serve.add_argument("--port", type=int, default=8010)
    return parser


def main(argv: list[str] | None = None) -> None:
    args = build_parser().parse_args(argv)
    config = PipelineConfig.from_env(output_root=args.output_root, season=args.season)
    logger = configure_logging(config, verbose=args.verbose)

    if args.command == "init-folders":
        config.ensure_directories()
        logger.info("Created image ingestion folders under %s", config.output_root)
        return

    from .storage import MetadataStore

    store = MetadataStore(config)

    if args.command == "scrape-iplt20":
        from .scrapers.iplt20 import IPLT20MetadataScraper

        players = IPLT20MetadataScraper(config, logger).scrape(limit=args.limit)
        store.write_players(players)
        logger.info("Wrote %s player metadata rows", len(players))
        return

    if args.command == "download-images":
        players = store.read_players(args.metadata)
        records, failures = asyncio.run(_download(config, store, players, args.limit, args.dry_run, logger))
        logger.info("Image records: %s; failures: %s", len(records), len(failures))
        return

    if args.command == "scrape-getty":
        from .scrapers.getty import GettyMetadataScraper

        rows = GettyMetadataScraper(config, logger).scrape(pages=args.pages, url=args.url)
        store.write_getty_metadata(rows)
        logger.info("Wrote %s Getty metadata rows", len(rows))
        return

    if args.command == "build-all":
        from .scrapers.getty import GettyMetadataScraper
        from .scrapers.iplt20 import IPLT20MetadataScraper

        players = IPLT20MetadataScraper(config, logger).scrape(limit=args.limit)
        store.write_players(players)
        records, failures = asyncio.run(_download(config, store, players, args.limit, args.dry_run, logger))
        logger.info("Image records: %s; failures: %s", len(records), len(failures))
        if not args.skip_getty:
            getty_rows = GettyMetadataScraper(config, logger).scrape(pages=args.getty_pages)
            store.write_getty_metadata(getty_rows)
            logger.info("Wrote %s Getty metadata rows", len(getty_rows))
        return

    if args.command == "serve":
        from .api import create_app
        import uvicorn

        uvicorn.run(create_app(config), host=args.host, port=args.port)
        return


async def _download(
    config: PipelineConfig,
    store: MetadataStore,
    players,
    limit: int | None,
    dry_run: bool,
    logger,
):
    from .downloader import AsyncImageDownloader
    from .processor import ImageProcessor

    downloader = AsyncImageDownloader(
        config=config,
        store=store,
        processor=ImageProcessor(config),
        logger=logger,
    )
    return await downloader.download_player_profiles(players, limit=limit, dry_run=dry_run)
