import csv
import pandas as pd
from pathlib import Path
from src.config import IMAGE_MAPPING_CSV
from src.utils import logger

class ImageDatabaseMapper:
    """Orchestrates metadata updates for tracking and mapping player assets to local files."""
    
    def __init__(self):
        self.csv_path = IMAGE_MAPPING_CSV
        self.fields = [
            "player_id", "player_name", "team", "image_type", 
            "image_url", "local_path", "source", "season", "tags"
        ]
        self._initialize_csv()
        
    def _initialize_csv(self):
        """Pre-seeds the image mapping database with headers if it does not already exist."""
        if not self.csv_path.exists():
            self.csv_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(self.fields)
            logger.info(f"Initialized new player images database map at: {self.csv_path.name}")
            
    def register_image(self, player_id: str, player_name: str, team: str, 
                       image_type: str, image_url: str, local_path: Path, 
                       source: str, season: str, tags: list):
        """Registers a new asset entry in the mapping database, updating existing entries as duplicates."""
        # Convert local_path to clean relative path from project root
        try:
            rel_path = str(local_path.relative_to(local_path.parent.parent.parent.parent.parent))
        except Exception:
            rel_path = str(local_path)
            
        tags_str = ";".join(tags)
        
        record = {
            "player_id": player_id,
            "player_name": player_name,
            "team": team,
            "image_type": image_type,
            "image_url": image_url,
            "local_path": rel_path,
            "source": source,
            "season": season,
            "tags": tags_str
        }
        
        # Avoid row duplication by filtering with pandas
        try:
            df = pd.read_csv(self.csv_path)
            # Check if this exact local path already exists
            match_mask = df["local_path"] == rel_path
            if match_mask.any():
                # Update properties in place
                for field in self.fields:
                    df.loc[match_mask, field] = record[field]
                logger.info(f"Updated registration map entry for {player_name}'s {image_type} asset.")
            else:
                # Append new row
                new_row = pd.DataFrame([record])
                df = pd.concat([df, new_row], ignore_index=True)
                logger.info(f"Registered new {image_type} image mapping record for {player_name}.")
                
            df.to_csv(self.csv_path, index=False, encoding='utf-8')
        except Exception as e:
            # Safe append fallback if pandas read/write hits concurrency lockouts
            logger.warning(f"Pandas lock warning, falling back to safe write append: {e}")
            with open(self.csv_path, 'a', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=self.fields)
                writer.writerow(record)
                
    def get_registered_images(self) -> pd.DataFrame:
        """Returns the complete mapping table in a parsed pandas DataFrame structure."""
        if self.csv_path.exists():
            return pd.read_csv(self.csv_path)
        return pd.DataFrame(columns=self.fields)
