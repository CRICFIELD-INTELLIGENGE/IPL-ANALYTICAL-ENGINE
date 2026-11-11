from __future__ import annotations

from pathlib import Path
from typing import Iterable, TypeVar

import pandas as pd

from .config import PipelineConfig
from .models import GettyMetadata, PlayerImageRecord, PlayerMetadata

T = TypeVar("T")


class MetadataStore:
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.config.ensure_directories()

    @property
    def players_csv(self) -> Path:
        return self.config.data_root / "players_metadata.csv"

    @property
    def players_json(self) -> Path:
        return self.config.data_root / "players_metadata.json"

    @property
    def images_csv(self) -> Path:
        return self.config.data_root / "player_images.csv"

    @property
    def getty_csv(self) -> Path:
        return self.config.data_root / "getty_metadata.csv"

    @property
    def failures_csv(self) -> Path:
        return self.config.data_root / "failed_images.csv"

    def write_players(self, players: Iterable[PlayerMetadata]) -> pd.DataFrame:
        df = pd.DataFrame([p.to_dict() for p in players])
        if df.empty:
            df = pd.DataFrame(columns=list(PlayerMetadata("").to_dict().keys()))
        df = df.drop_duplicates(subset=["player_id", "player_name", "player_profile_url"], keep="last")
        df.to_csv(self.players_csv, index=False)
        df.to_json(self.players_json, orient="records", indent=2)
        return df

    def read_players(self, path: Path | None = None) -> list[PlayerMetadata]:
        source = path or self.players_csv
        if not source.exists():
            return []
        df = pd.read_csv(source, dtype=str).fillna("")
        return [PlayerMetadata(**row) for row in df.to_dict(orient="records")]

    def write_image_records(self, records: Iterable[PlayerImageRecord]) -> pd.DataFrame:
        df = pd.DataFrame([record.to_dict() for record in records])
        if self.images_csv.exists():
            old = pd.read_csv(self.images_csv, dtype=str).fillna("")
            df = pd.concat([old, df], ignore_index=True)
        if df.empty:
            df = pd.DataFrame(columns=list(PlayerImageRecord("", "", "", "", "", "", "", "", "").to_dict().keys()))
        df = df.drop_duplicates(subset=["player_id", "image_type", "local_path"], keep="last")
        df.to_csv(self.images_csv, index=False)
        return df

    def write_getty_metadata(self, rows: Iterable[GettyMetadata]) -> pd.DataFrame:
        df = pd.DataFrame([row.to_dict() for row in rows])
        if df.empty:
            df = pd.DataFrame(columns=list(GettyMetadata("", "").to_dict().keys()))
        df = df.drop_duplicates(subset=["source_url", "caption"], keep="last")
        df.to_csv(self.getty_csv, index=False)
        return df

    def write_failures(self, rows: Iterable[dict[str, str]]) -> pd.DataFrame:
        df = pd.DataFrame(list(rows))
        if self.failures_csv.exists():
            old = pd.read_csv(self.failures_csv, dtype=str).fillna("")
            df = pd.concat([old, df], ignore_index=True)
        if df.empty:
            df = pd.DataFrame(columns=["player_id", "player_name", "image_url", "reason"])
        df.to_csv(self.failures_csv, index=False)
        return df
