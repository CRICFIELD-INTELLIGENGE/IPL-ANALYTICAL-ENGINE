from __future__ import annotations

import logging
import re
import time

import requests
from bs4 import BeautifulSoup, Tag

from ..config import PipelineConfig
from ..models import GettyMetadata
from ..tagger import generate_tags
from ..utils import canonical_url, clean_text


class GettyMetadataScraper:
    """Collect publicly visible Getty reference metadata only.

    The pipeline intentionally does not download Getty images or attempt to
    access restricted/private assets.
    """

    DEFAULT_URL = "https://www.gettyimages.in/photos/ipl-cricket"

    def __init__(self, config: PipelineConfig, logger: logging.Logger | None = None):
        self.config = config
        self.logger = logger or logging.getLogger("image_ingestion.getty")
        self.session = requests.Session()
        self.session.headers.update(self.config.http.headers())

    def scrape(self, pages: int = 1, url: str = DEFAULT_URL) -> list[GettyMetadata]:
        rows: list[GettyMetadata] = []
        for page in range(1, pages + 1):
            page_url = url if page == 1 else f"{url}?page={page}"
            soup = self._soup(page_url)
            page_rows = self._parse_page(soup, page_url)
            self.logger.info("Parsed %s Getty metadata rows from %s", len(page_rows), page_url)
            rows.extend(page_rows)
            time.sleep(self.config.http.polite_delay_seconds)
        return self._dedupe(rows)

    def _soup(self, url: str) -> BeautifulSoup:
        response = self.session.get(url, timeout=self.config.http.timeout_seconds)
        response.raise_for_status()
        return BeautifulSoup(response.text, "html.parser")

    def _parse_page(self, soup: BeautifulSoup, page_url: str) -> list[GettyMetadata]:
        rows: list[GettyMetadata] = []
        cards = self._candidate_cards(soup)
        for card in cards:
            caption = self._caption(card)
            source_url = self._detail_url(card, page_url)
            if not caption and not source_url:
                continue
            rows.append(
                GettyMetadata(
                    caption=caption,
                    source_url=source_url,
                    player_names=self._player_names(caption),
                    event_name=self._event_name(caption),
                    season=self._season(caption),
                    image_categories=generate_tags(caption),
                )
            )
        return rows

    def _candidate_cards(self, soup: BeautifulSoup) -> list[Tag]:
        cards: list[Tag] = []
        for selector in ("figure", "[data-testid*='gallery']", "article", "a[href*='/detail/']"):
            cards.extend(tag for tag in soup.select(selector) if isinstance(tag, Tag))
        unique: list[Tag] = []
        seen: set[int] = set()
        for card in cards:
            marker = id(card)
            if marker not in seen:
                unique.append(card)
                seen.add(marker)
        return unique

    def _caption(self, card: Tag) -> str:
        image = card.select_one("img")
        candidates = [
            image.get("alt", "") if image else "",
            image.get("title", "") if image else "",
            card.get("aria-label", ""),
            card.get("title", ""),
            card.get_text(" "),
        ]
        return clean_text(next((c for c in candidates if clean_text(str(c))), ""))

    def _detail_url(self, card: Tag, page_url: str) -> str:
        anchor = card if card.name == "a" else card.select_one("a[href*='/detail/']")
        return canonical_url(anchor.get("href", ""), page_url).split("?")[0] if isinstance(anchor, Tag) else ""

    def _player_names(self, caption: str) -> list[str]:
        caption = clean_text(caption)
        names = set()
        for match in re.finditer(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b", caption):
            candidate = match.group(1)
            if any(word in candidate.lower() for word in ("indian premier", "premier league", "getty images")):
                continue
            names.add(candidate)
        return sorted(names)

    def _event_name(self, caption: str) -> str:
        match = re.search(r"(Indian Premier League|IPL(?:\s+\d{4})?|Final|Qualifier|Eliminator)", caption, flags=re.I)
        return clean_text(match.group(0)) if match else ""

    def _season(self, caption: str) -> str:
        match = re.search(r"\b(20\d{2}|2008|2009|2010|2011|2012|2013|2014|2015|2016|2017|2018|2019)\b", caption)
        return match.group(1) if match else ""

    def _dedupe(self, rows: list[GettyMetadata]) -> list[GettyMetadata]:
        deduped: dict[str, GettyMetadata] = {}
        for row in rows:
            key = row.source_url or row.caption
            deduped[key] = row
        return list(deduped.values())
