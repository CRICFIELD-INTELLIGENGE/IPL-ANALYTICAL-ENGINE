import json
import pandas as pd
from src.config import METADATA_JSON, IMAGE_MAPPING_CSV
from src.utils import logger, sanitize_name

class APIService:
    """Core logic handlers for processing player image queries and roster feeds."""
    
    def __init__(self):
        self.metadata_path = METADATA_JSON
        self.mapping_path = IMAGE_MAPPING_CSV
        
    def _load_players_metadata(self) -> list:
        """Loads and returns all scraped player profiles from local JSON cache."""
        if self.metadata_path.exists():
            try:
                with open(self.metadata_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading player metadata: {e}")
        return []

    def _load_images_mapping(self) -> pd.DataFrame:
        """Loads and returns all registered local player image files in a pandas DataFrame."""
        if self.mapping_path.exists():
            try:
                return pd.read_csv(self.mapping_path)
            except Exception as e:
                logger.error(f"Error loading image mapping: {e}")
        return pd.DataFrame()

    def get_player_by_id(self, player_id: str) -> dict:
        """Finds a player profile matching the requested official ID."""
        players = self._load_players_metadata()
        for p in players:
            if str(p.get("player_id")) == str(player_id):
                return p
        # Attempt fallback search by matching clean lowercase snake_case slugs
        for p in players:
            if sanitize_name(p.get("player_name")) == sanitize_name(player_id):
                return p
        return {}

    def get_player_images(self, player_id: str) -> list:
        """Returns a list of all registered local image files for a specific player ID."""
        df = self._load_images_mapping()
        if df.empty:
            return []
            
        # Match by either exact player_id or sanitize_name(player_name)
        player_profile = self.get_player_by_id(player_id)
        p_name = player_profile.get("player_name", "")
        
        matches = df[
            (df["player_id"].astype(str) == str(player_id)) | 
            (df["player_name"].str.lower() == p_name.lower())
        ]
        
        records = []
        for _, row in matches.iterrows():
            tags_list = str(row["tags"]).split(";") if pd.notna(row["tags"]) else []
            records.append({
                "player_id": row["player_id"],
                "player_name": row["player_name"],
                "image_type": row["image_type"],
                "image_url": row["image_url"],
                "local_path": row["local_path"],
                "source": row["source"],
                "season": row["season"],
                "tags": tags_list
            })
        return records

    def get_team_images(self, team_name: str) -> list:
        """Gets all registered image assets of players in the selected franchise team."""
        df = self._load_images_mapping()
        if df.empty:
            return []
            
        t_clean = sanitize_name(team_name)
        # Match team names by partial lower case matching
        matches = df[df["team"].apply(lambda t: sanitize_name(str(t)) == t_clean if pd.notna(t) else False)]
        
        records = []
        for _, row in matches.iterrows():
            tags_list = str(row["tags"]).split(";") if pd.notna(row["tags"]) else []
            records.append({
                "player_id": row["player_id"],
                "player_name": row["player_name"],
                "image_type": row["image_type"],
                "image_url": row["image_url"],
                "local_path": row["local_path"],
                "tags": tags_list
            })
        return records
