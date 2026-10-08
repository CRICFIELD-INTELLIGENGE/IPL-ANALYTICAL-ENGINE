from __future__ import annotations

import asyncio
import hashlib
import logging
from pathlib import Path

import aiohttp

from .config import PipelineConfig
from .classification import ImageClassificationHook, NoopImageClassifier
from .models import PlayerImageRecord, PlayerMetadata
from .processor import ImageProcessor
from .storage import MetadataStore
from .tagger import generate_tags, tag_string
from .utils import slugify, source_name, valid_public_url


class ImageDownloadError(RuntimeError):
    pass


class AsyncImageDownloader:
    def __init__(
        self,
        config: PipelineConfig,
        store: MetadataStore,
        processor: ImageProcessor | None = None,
        classifier: ImageClassificationHook | None = None,
        logger: logging.Logger | None = None,
    ):
        self.config = config
        self.store = store
        self.processor = processor or ImageProcessor(config)
        self.classifier = classifier or NoopImageClassifier()
        self.logger = logger or logging.getLogger("image_ingestion.downloader")
        self._seen_urls: set[str] = set()

    async def download_player_profiles(
        self,
        players: list[PlayerMetadata],
        limit: int | None = None,
        dry_run: bool = False,
    ) -> tuple[list[PlayerImageRecord], list[dict[str, str]]]:
        self.config.ensure_directories()
        selected_players = players[:limit] if limit else players
        timeout = aiohttp.ClientTimeout(total=self.config.http.timeout_seconds)
        connector = aiohttp.TCPConnector(limit=self.config.http.concurrency, ttl_dns_cache=300)
        semaphore = asyncio.Semaphore(self.config.http.concurrency)
        records: list[PlayerImageRecord] = []
        failures: list[dict[str, str]] = []

        async with aiohttp.ClientSession(
            headers=self.config.http.headers(),
            timeout=timeout,
            connector=connector,
        ) as session:
            tasks = [
                self._download_one(session, semaphore, player, dry_run)
                for player in selected_players
                if player.player_image_url
            ]
            for result in await asyncio.gather(*tasks, return_exceptions=True):
                if isinstance(result, PlayerImageRecord):
                    records.append(result)
                elif isinstance(result, dict):
                    failures.append(result)
                elif isinstance(result, Exception):
                    failures.append({"player_id": "", "player_name": "", "image_url": "", "reason": str(result)})

        if records:
            self.store.write_image_records(records)
        if failures:
            self.store.write_failures(failures)
        return records, failures

    async def _download_one(
        self,
        session: aiohttp.ClientSession,
        semaphore: asyncio.Semaphore,
        player: PlayerMetadata,
        dry_run: bool,
    ) -> PlayerImageRecord | dict[str, str]:
        image_url = player.player_image_url.strip()
        if not valid_public_url(image_url):
            return self._failure(player, "Invalid or non-public image URL")

        url_key = hashlib.sha256(image_url.encode("utf-8")).hexdigest()
        if url_key in self._seen_urls:
            return self._failure(player, "Duplicate image URL skipped")
        self._seen_urls.add(url_key)

        player_dir = self.config.players_assets_root / slugify(player.player_name)
        output_path = player_dir / "profile.webp"
        if output_path.exists():
            return self._record(player, image_url, output_path, width=0, height=0, blur_placeholder="")

        if dry_run:
            return self._record(player, image_url, output_path, width=0, height=0, blur_placeholder="")

        async with semaphore:
            try:
                image_bytes = await self._fetch_image(session, image_url)
                processed = self.processor.process_profile_image(image_bytes, player_dir)
                await asyncio.sleep(self.config.http.polite_delay_seconds)
                return self._record(
                    player,
                    image_url,
                    self.config.output_root / processed.local_path,
                    width=processed.width,
                    height=processed.height,
                    blur_placeholder=processed.blur_placeholder,
                    variants=processed.variants,
                )
            except Exception as exc:
                self.logger.warning("Image download failed for %s: %s", player.player_name, exc)
                return self._failure(player, str(exc))

    async def _fetch_image(self, session: aiohttp.ClientSession, image_url: str) -> bytes:
        last_error: Exception | None = None
        for attempt in range(1, self.config.http.retries + 1):
            try:
                async with session.get(image_url, allow_redirects=True) as response:
                    if response.status >= 400:
                        raise ImageDownloadError(f"HTTP {response.status}")
                    content_type = response.headers.get("Content-Type", "").lower()
                    if "image" not in content_type:
                        raise ImageDownloadError(f"Unexpected content type: {content_type or 'unknown'}")
                    length = int(response.headers.get("Content-Length") or 0)
                    if length and length > self.config.http.max_image_bytes:
                        raise ImageDownloadError(f"Image too large: {length} bytes")
                    data = await response.read()
                    if len(data) > self.config.http.max_image_bytes:
                        raise ImageDownloadError(f"Image too large: {len(data)} bytes")
                    return data
            except Exception as exc:
                last_error = exc
                await asyncio.sleep(self.config.http.backoff_seconds * attempt)
        raise ImageDownloadError(str(last_error) if last_error else "Unknown download failure")

    def _record(
        self,
        player: PlayerMetadata,
        image_url: str,
        output_path: Path,
        width: int,
        height: int,
        blur_placeholder: str,
        variants: dict[int, str] | None = None,
    ) -> PlayerImageRecord:
        classifier_tags = self.classifier.classify(output_path, player.to_dict()) if output_path.exists() else ()
        tags = generate_tags(player.player_name, player.role, "profile", extra_tags=("profile", *classifier_tags))
        local_path = output_path.relative_to(self.config.output_root).as_posix() if output_path.is_absolute() else output_path.as_posix()
        return PlayerImageRecord(
            player_id=player.player_id,
            player_name=player.player_name,
            team=player.current_team,
            image_type="profile",
            image_url=image_url,
            local_path=local_path,
            source=source_name(image_url),
            season=self.config.season,
            tags=tag_string(tags),
            width=width,
            height=height,
            blur_placeholder=blur_placeholder,
            responsive_variants=";".join(f"{width}={path}" for width, path in sorted((variants or {}).items())),
        )

    def _failure(self, player: PlayerMetadata, reason: str) -> dict[str, str]:
        return {
            "player_id": player.player_id,
            "player_name": player.player_name,
            "image_url": player.player_image_url,
            "reason": reason,
        }
