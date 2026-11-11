from __future__ import annotations

import logging
import re
import time
from collections.abc import Iterable
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup, Tag

from ..config import PipelineConfig
from ..models import PlayerMetadata
from ..utils import canonical_url, clean_text, parse_player_id, slugify


class IPLT20MetadataScraper:
    """Scrape publicly visible player metadata from iplt20.com.

    This scraper only requests public pages, uses no credentials, and does not
    attempt to bypass bot controls or restricted content.
    """

    BASE_URL = "https://www.iplt20.com"

    def __init__(self, config: PipelineConfig, logger: logging.Logger | None = None):
        self.config = config
        self.logger = logger or logging.getLogger("image_ingestion.iplt20")
        self.session = requests.Session()
        self.session.headers.update(self.config.http.headers())

    def scrape(self, limit: int | None = None) -> list[PlayerMetadata]:
        team_links = self._team_links()
        self.logger.info("Found %s IPLT20 team pages", len(team_links))
        players: list[PlayerMetadata] = []

        for team_url in team_links:
            if limit and len(players) >= limit:
                break
            team_name = self._team_name_from_url(team_url)
            soup = self._soup(team_url)
            team_players = self._parse_team_page(soup, team_url, team_name)
            self.logger.info("Parsed %s players from %s", len(team_players), team_name)

            for player in team_players:
                if limit and len(players) >= limit:
                    break
                if player.player_profile_url:
                    detailed = self._profile_details(player)
                    player = self._merge_player(player, detailed)
                players.append(player)
                time.sleep(self.config.http.polite_delay_seconds)

        return self._dedupe(players)

    def _team_links(self) -> list[str]:
        soup = self._soup(f"{self.BASE_URL}/teams")
        links = set()
        for anchor in soup.select("a[href]"):
            href = canonical_url(anchor.get("href", ""), self.BASE_URL)
            if "/teams/men/" in href:
                links.add(href.split("?")[0])
        return sorted(links)

    def _parse_team_page(self, soup: BeautifulSoup, page_url: str, team_name: str) -> list[PlayerMetadata]:
        cards = self._candidate_player_cards(soup)
        players: list[PlayerMetadata] = []
        for card in cards:
            profile_url = self._profile_url(card, page_url)
            name = self._player_name(card)
            image_url = self._image_url(card, page_url)
            player_id = parse_player_id(profile_url)
            if not name and profile_url:
                name = self._name_from_profile_url(profile_url)
            if not name:
                continue
            players.append(
                PlayerMetadata(
                    player_id=player_id,
                    player_name=name,
                    current_team=team_name,
                    role=self._labeled_value(card, ("role", "specialism", "type")),
                    nationality=self._labeled_value(card, ("nationality", "country")),
                    batting_style=self._labeled_value(card, ("batting style", "bat style")),
                    bowling_style=self._labeled_value(card, ("bowling style", "bowl style")),
                    player_profile_url=profile_url,
                    player_image_url=image_url,
                )
            )
        return players

    def _profile_details(self, player: PlayerMetadata) -> PlayerMetadata:
        try:
            soup = self._soup(player.player_profile_url)
        except requests.RequestException as exc:
            self.logger.warning("Profile fetch failed for %s: %s", player.player_name, exc)
            return player

        og_image = ""
        og = soup.select_one("meta[property='og:image'], meta[name='twitter:image']")
        if og:
            og_image = canonical_url(og.get("content", ""), player.player_profile_url)

        return PlayerMetadata(
            player_id=player.player_id or parse_player_id(player.player_profile_url),
            player_name=self._profile_heading(soup) or player.player_name,
            current_team=player.current_team,
            role=self._document_value(soup, ("role", "playing role", "specialism")) or player.role,
            nationality=self._document_value(soup, ("nationality", "country")) or player.nationality,
            batting_style=self._document_value(soup, ("batting style", "bat style")) or player.batting_style,
            bowling_style=self._document_value(soup, ("bowling style", "bowl style")) or player.bowling_style,
            player_profile_url=player.player_profile_url,
            player_image_url=og_image or player.player_image_url,
        )

    def _soup(self, url: str) -> BeautifulSoup:
        response = self.session.get(url, timeout=self.config.http.timeout_seconds)
        response.raise_for_status()
        return BeautifulSoup(response.text, "html.parser")

    def _candidate_player_cards(self, soup: BeautifulSoup) -> list[Tag]:
        cards: list[Tag] = []
        selectors = [
            ".ih-p-c-wrap",
            ".player-card",
            ".ap-player-item",
            ".vn-playerCard",
            "[class*='player-card']",
            "[class*='playerCard']",
        ]
        for selector in selectors:
            cards.extend(tag for tag in soup.select(selector) if isinstance(tag, Tag))

        for anchor in soup.select("a[href*='/players/']"):
            parent = anchor.find_parent(["article", "li", "div"])
            if isinstance(parent, Tag):
                cards.append(parent)

        unique: list[Tag] = []
        seen: set[int] = set()
        for card in cards:
            marker = id(card)
            if marker not in seen:
                unique.append(card)
                seen.add(marker)
        return unique

    def _profile_url(self, card: Tag, base_url: str) -> str:
        anchor = card.select_one("a[href*='/players/']")
        return canonical_url(anchor.get("href", ""), base_url).split("?")[0] if anchor else ""

    def _player_name(self, card: Tag) -> str:
        selectors = [".ih-p-name", ".player-name", ".vn-player-name", "[class*='player-name']", "h2", "h3", "h4"]
        for selector in selectors:
            tag = card.select_one(selector)
            text = clean_text(tag.get_text(" ")) if tag else ""
            if text and not re.search(r"\b(view|profile|team)\b", text, flags=re.I):
                return text
        image = card.select_one("img[alt]")
        return clean_text(image.get("alt", "")) if image else ""

    def _image_url(self, card: Tag, base_url: str) -> str:
        image = card.select_one("img")
        if not image:
            return ""
        for attr in ("data-src", "data-original", "src"):
            value = image.get(attr)
            if value:
                return canonical_url(str(value), base_url)
        srcset = image.get("srcset")
        if srcset:
            first = str(srcset).split(",")[0].strip().split(" ")[0]
            return canonical_url(first, base_url)
        return ""

    def _labeled_value(self, card: Tag, labels: Iterable[str]) -> str:
        text = clean_text(card.get_text(" "))
        return self._value_from_text(text, labels)

    def _document_value(self, soup: BeautifulSoup, labels: Iterable[str]) -> str:
        return self._value_from_text(clean_text(soup.get_text(" ")), labels)

    def _value_from_text(self, text: str, labels: Iterable[str]) -> str:
        for label in labels:
            pattern = rf"{re.escape(label)}\s*:?\s*([A-Za-z0-9 .,'/-]+?)(?=\s+[A-Z][A-Za-z ]+\s*:|$)"
            match = re.search(pattern, text, flags=re.I)
            if match:
                return clean_text(match.group(1))
        return ""

    def _profile_heading(self, soup: BeautifulSoup) -> str:
        for selector in ("h1", ".player-name", ".ih-p-name"):
            tag = soup.select_one(selector)
            text = clean_text(tag.get_text(" ")) if tag else ""
            if text:
                return text
        return ""

    def _team_name_from_url(self, url: str) -> str:
        path = urlparse(url).path.rstrip("/")
        slug = path.split("/")[-1]
        return " ".join(part.capitalize() for part in slug.split("-"))

    def _name_from_profile_url(self, url: str) -> str:
        path = urlparse(url).path.rstrip("/")
        slug = path.split("/")[-1]
        if slug.isdigit() and len(path.split("/")) > 1:
            slug = path.split("/")[-2]
        return " ".join(part.capitalize() for part in slugify(slug).split("_"))

    def _merge_player(self, base: PlayerMetadata, detailed: PlayerMetadata) -> PlayerMetadata:
        return PlayerMetadata(
            player_id=detailed.player_id or base.player_id,
            player_name=detailed.player_name or base.player_name,
            current_team=base.current_team,
            role=detailed.role or base.role,
            nationality=detailed.nationality or base.nationality,
            batting_style=detailed.batting_style or base.batting_style,
            bowling_style=detailed.bowling_style or base.bowling_style,
            player_profile_url=base.player_profile_url,
            player_image_url=detailed.player_image_url or base.player_image_url,
        )

    def _dedupe(self, players: list[PlayerMetadata]) -> list[PlayerMetadata]:
        deduped: dict[str, PlayerMetadata] = {}
        for player in players:
            key = player.player_id or player.player_profile_url or player.player_name.lower()
            deduped[key] = player
        return sorted(deduped.values(), key=lambda p: (p.current_team, p.player_name))
