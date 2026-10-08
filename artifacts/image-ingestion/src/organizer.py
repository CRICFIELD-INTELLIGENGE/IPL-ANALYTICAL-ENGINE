from pathlib import Path
from src.config import ASSETS_DIR
from src.utils import logger, sanitize_name

class DirectoryOrganizer:
    """Manages the complete structural file system hierarchy for players, teams, venues, and matches."""
    
    def __init__(self):
        self.players_dir = ASSETS_DIR / "players"
        self.teams_dir = ASSETS_DIR / "teams"
        self.venues_dir = ASSETS_DIR / "venues"
        self.matches_dir = ASSETS_DIR / "matches"
        
    def setup_base_structure(self):
        """Initializes base subdirectories for structured asset separation."""
        logger.info("Initializing baseline directory hierarchy structure...")
        for directory in [self.players_dir, self.teams_dir, self.venues_dir, self.matches_dir]:
            directory.mkdir(parents=True, exist_ok=True)
            logger.info(f"Verified target assets directory: {directory.relative_to(ASSETS_DIR.parent)}")
            
    def get_player_directory(self, player_name: str) -> Path:
        """Returns and ensures unique directory path for a specific player name (lower_snake_case)."""
        folder_name = sanitize_name(player_name)
        player_folder = self.players_dir / folder_name
        player_folder.mkdir(parents=True, exist_ok=True)
        return player_folder
        
    def get_team_directory(self, team_name: str) -> Path:
        """Returns and ensures unique directory path for a specific IPL franchise."""
        folder_name = sanitize_name(team_name)
        team_folder = self.teams_dir / folder_name
        team_folder.mkdir(parents=True, exist_ok=True)
        return team_folder
        
    def execute(self):
        """Pre-creates directories for matches and venues."""
        self.setup_base_structure()
        logger.info("Directory organizer verified all primary asset paths successfully.")
