from __future__ import annotations

from collections.abc import Iterable

from .utils import clean_text

TAG_KEYWORDS: dict[str, tuple[str, ...]] = {
    "batting": ("bat", "batsman", "batter", "six", "four", "shot", "runs", "innings"),
    "bowling": ("bowl", "bowler", "wicket", "spell", "yorker", "spinner", "pacer"),
    "celebration": ("celebrat", "celebrates", "victory", "won", "win", "cheer"),
    "fielding": ("field", "catch", "diving", "run out", "stumping"),
    "crowd": ("crowd", "fans", "supporters", "stands", "spectators"),
    "trophy": ("trophy", "champion", "final", "title", "presentation"),
    "captain": ("captain", "skipper", "toss"),
    "action_shot": ("action", "plays", "during", "match", "delivery", "appeals"),
}


def generate_tags(*parts: str, extra_tags: Iterable[str] = ()) -> list[str]:
    text = clean_text(" ".join(part for part in parts if part)).lower()
    tags = {tag for tag, keywords in TAG_KEYWORDS.items() if any(k in text for k in keywords)}
    tags.update(tag for tag in extra_tags if tag)
    return sorted(tags)


def infer_image_type(filename: str, caption: str = "") -> str:
    tags = generate_tags(filename, caption)
    for image_type in ("batting", "bowling", "celebration", "fielding", "trophy", "crowd"):
        if image_type in tags:
            return image_type
    return "profile"


def tag_string(tags: Iterable[str]) -> str:
    return ";".join(sorted(set(tag for tag in tags if tag)))
