from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import urljoin, urlparse


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value or "unknown"


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def canonical_url(url: str, base_url: str) -> str:
    url = clean_text(url)
    if not url:
        return ""
    if url.startswith("//"):
        return "https:" + url
    return urljoin(base_url, url)


def valid_public_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def source_name(url: str) -> str:
    parsed = urlparse(url)
    return parsed.netloc.lower().replace("www.", "")


def parse_player_id(url: str, fallback: str = "") -> str:
    match = re.search(r"/players?/(?:[^/]+/)?(\d+)(?:/|$)", url)
    if match:
        return match.group(1)
    match = re.search(r"(?:playerId|player_id|pid)[=/](\d+)", url)
    return match.group(1) if match else fallback


def relative_posix(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()
