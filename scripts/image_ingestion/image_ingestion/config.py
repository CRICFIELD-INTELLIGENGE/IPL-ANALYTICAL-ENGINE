from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def default_repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


@dataclass(frozen=True)
class HTTPConfig:
    timeout_seconds: int = 25
    retries: int = 3
    backoff_seconds: float = 0.8
    concurrency: int = 8
    polite_delay_seconds: float = 0.25
    max_image_mb: int = 12
    user_agent: str = (
        "IPLAnalyticsImageIngestion/0.1 "
        "(public metadata and image URL ingestion; contact: local-project)"
    )

    @property
    def max_image_bytes(self) -> int:
        return self.max_image_mb * 1024 * 1024

    def headers(self) -> dict[str, str]:
        return {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }


@dataclass(frozen=True)
class ImageConfig:
    max_dimension: int = 1200
    webp_quality: int = 82
    responsive_widths: tuple[int, ...] = (320, 640, 960)
    blur_width: int = 24


@dataclass(frozen=True)
class PipelineConfig:
    repo_root: Path = field(default_factory=default_repo_root)
    output_root: Path | None = None
    season: str = "2025"
    http: HTTPConfig = field(default_factory=HTTPConfig)
    image: ImageConfig = field(default_factory=ImageConfig)

    def __post_init__(self) -> None:
        if self.output_root is None:
            object.__setattr__(
                self,
                "output_root",
                self.repo_root / "artifacts" / "image-ingestion",
            )

    @classmethod
    def from_env(cls, output_root: str | None = None, season: str | None = None) -> "PipelineConfig":
        env_output = output_root or os.getenv("IPL_IMAGE_OUTPUT_ROOT")
        env_season = season or os.getenv("IPL_IMAGE_SEASON") or "2025"
        return cls(output_root=Path(env_output).resolve() if env_output else None, season=env_season)

    @property
    def data_root(self) -> Path:
        return self.output_root / "data"

    @property
    def assets_root(self) -> Path:
        return self.output_root / "assets"

    @property
    def logs_root(self) -> Path:
        return self.output_root / "logs"

    @property
    def players_assets_root(self) -> Path:
        return self.assets_root / "players"

    def ensure_directories(self) -> None:
        for path in (
            self.data_root,
            self.logs_root,
            self.assets_root / "players",
            self.assets_root / "teams",
            self.assets_root / "venues",
            self.assets_root / "matches",
        ):
            path.mkdir(parents=True, exist_ok=True)
