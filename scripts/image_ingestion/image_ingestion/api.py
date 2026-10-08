from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException

from .config import PipelineConfig


def _records(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    return pd.read_csv(path, dtype=str).fillna("").to_dict(orient="records")


def _config() -> PipelineConfig:
    return PipelineConfig.from_env(output_root=os.getenv("IPL_IMAGE_OUTPUT_ROOT"))


@lru_cache(maxsize=1)
def _players() -> list[dict[str, str]]:
    return _records(_config().data_root / "players_metadata.csv")


@lru_cache(maxsize=1)
def _images() -> list[dict[str, str]]:
    return _records(_config().data_root / "player_images.csv")


def create_app(config: PipelineConfig | None = None) -> FastAPI:
    if config is not None:
        os.environ["IPL_IMAGE_OUTPUT_ROOT"] = str(config.output_root)

    app = FastAPI(
        title="IPL Image Ingestion API",
        version="0.1.0",
        description="Serves player image metadata and optimized asset mappings.",
    )

    @app.get("/api/player/{player_id}")
    def player(player_id: str) -> dict[str, object]:
        row = _find_player(player_id)
        if not row:
            raise HTTPException(status_code=404, detail="Player not found")
        return {"player": row, "images": _player_images(row)}

    @app.get("/api/player/{player_id}/images")
    def player_images(player_id: str) -> dict[str, object]:
        row = _find_player(player_id)
        if not row:
            raise HTTPException(status_code=404, detail="Player not found")
        return {"player_id": row.get("player_id", ""), "player_name": row.get("player_name", ""), "images": _player_images(row)}

    @app.get("/api/team/{team}/images")
    def team_images(team: str) -> dict[str, object]:
        wanted = _normalize(team)
        images = [
            row for row in _images()
            if _normalize(row.get("team", "")) == wanted or wanted in _normalize(row.get("team", ""))
        ]
        return {"team": team, "count": len(images), "images": images}

    @app.post("/api/cache/refresh")
    def refresh_cache() -> dict[str, str]:
        _players.cache_clear()
        _images.cache_clear()
        return {"status": "refreshed"}

    return app


def _find_player(player_id: str) -> dict[str, str] | None:
    wanted = _normalize(player_id)
    for row in _players():
        if row.get("player_id") == player_id or _normalize(row.get("player_name", "")) == wanted:
            return row
    return None


def _player_images(player: dict[str, str]) -> list[dict[str, str]]:
    player_id = player.get("player_id", "")
    name = _normalize(player.get("player_name", ""))
    return [
        row for row in _images()
        if row.get("player_id") == player_id or _normalize(row.get("player_name", "")) == name
    ]


def _normalize(value: str) -> str:
    return value.lower().replace("_", " ").replace("-", " ").strip()


app = create_app()
