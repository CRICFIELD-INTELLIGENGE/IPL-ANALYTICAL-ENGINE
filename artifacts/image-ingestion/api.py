#!/usr/bin/env python
"""
IPL Cricket Ingestion FastAPI Service.
Serves scraped player profiles, local image assets, and tags.
"""
import sys
import uvicorn
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Add current folder to path
sys.path.append(str(Path(__file__).resolve().parent))

from src.api_service import APIService
from src.config import ASSETS_DIR, DATA_DIR
from src.utils import logger

app = FastAPI(
    title="IPL Cricket Image Ingestion API",
    description="High-performance query API serving optimized WebP cricket player profile images and metadata.",
    version="1.0.0"
)

# Enable CORS for Next.js frontend calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve physical WebP image assets directly
app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")

api_service = APIService()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "IPL Cricket Ingestion & Optimization API",
        "docs_url": "/docs"
    }

@app.get("/api/status")
def get_status():
    """Returns general file count statistics on player databases."""
    try:
        images_count = 0
        if (DATA_DIR / "player_images.csv").exists():
            import pandas as pd
            df = pd.read_csv(DATA_DIR / "player_images.csv")
            images_count = len(df)
            
        players_count = 0
        if (DATA_DIR / "players_metadata.json").exists():
            import json
            with open(DATA_DIR / "players_metadata.json", 'r', encoding='utf-8') as f:
                players_count = len(json.load(f))
                
        return {
            "status": "healthy",
            "indexed_players": players_count,
            "registered_assets": images_count
        }
    except Exception as e:
        logger.error(f"Error fetching status: {e}")
        return {"status": "degraded", "error": str(e)}

@app.get("/api/player/{id}")
def get_player(id: str):
    """Fetches full career metadata profile for a single player ID or clean name slug."""
    profile = api_service.get_player_by_id(id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Player profile with ID or Slug '{id}' not found.")
    return profile

@app.get("/api/player/{id}/images")
def get_player_images(id: str):
    """Fetches list of all local WebP optimized images registered for the player."""
    images = api_service.get_player_images(id)
    if not images:
        # Check if player even exists
        profile = api_service.get_player_by_id(id)
        if not profile:
            raise HTTPException(status_code=404, detail=f"Player with ID '{id}' not found.")
        return []
    return images

@app.get("/api/team/{team}/images")
def get_team_images(team: str):
    """Fetches all registered local images of athletes belonging to a specific IPL franchise."""
    images = api_service.get_team_images(team)
    return images

if __name__ == "__main__":
    logger.info("Starting FastAPI Cricket Image API on port 8000...")
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
