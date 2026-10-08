from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(slots=True)
class PlayerMetadata:
    player_name: str
    player_id: str = ""
    current_team: str = ""
    role: str = ""
    nationality: str = ""
    batting_style: str = ""
    bowling_style: str = ""
    player_profile_url: str = ""
    player_image_url: str = ""
    source: str = "iplt20"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class PlayerImageRecord:
    player_id: str
    player_name: str
    team: str
    image_type: str
    image_url: str
    local_path: str
    source: str
    season: str
    tags: str
    width: int = 0
    height: int = 0
    blur_placeholder: str = ""
    responsive_variants: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class GettyMetadata:
    caption: str
    source_url: str
    player_names: list[str] = field(default_factory=list)
    event_name: str = ""
    season: str = ""
    image_categories: list[str] = field(default_factory=list)
    source: str = "gettyimages.in"

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["player_names"] = ";".join(self.player_names)
        data["image_categories"] = ";".join(self.image_categories)
        return data
