import re
from src.utils import logger

class ImageTaggingEngine:
    """Intelligently processes filenames, metadata, and titles to label images with tags."""
    
    def __init__(self):
        # Keyword-to-tag mappings
        self.rules = {
            "batting": [r"batting", r"bat", r"six", r"four", r"boundary", r"strike", r"century", r"runs"],
            "bowling": [r"bowling", r"bowl", r"wicket", r"delivery", r"seam", r"spin", r"stump", r"dismissal"],
            "celebration": [r"celebration", r"celebrating", r"fist_pump", r"jump", r"cheer", r"roar", r"smile", r"win"],
            "fielding": [r"fielding", r"catch", r"dive", r"throw", r"runout", r"keeper", r"gloves"],
            "crowd": [r"crowd", r"fans", r"stadium", r"stands", r"cheering", r"spectators"],
            "trophy": [r"trophy", r"cup", r"champions", r"medal", r"award", r"podium"],
            "captain": [r"captain", r"toss", r"dhoni", r"rohit", r"hardik", r"samson", r"faf"],
            "action_shot": [r"action", r"play", r"match", r"game", r"vs", r"stadium", r"pitch"]
        }
        
    def generate_tags(self, filename: str, player_role: str = "", context_text: str = "") -> list:
        """Determines relevant tags based on name parsing, player properties, and caption contexts."""
        tags = set()
        
        normalized_str = f"{filename} {player_role} {context_text}".lower()
        
        # Apply regex pattern rules
        for tag_name, patterns in self.rules.items():
            for pattern in patterns:
                if re.search(pattern, normalized_str):
                    tags.add(tag_name)
                    break
                    
        # Apply fallback defaults based on role if no actionable tags are found
        if not tags:
            if "bat" in player_role.lower():
                tags.add("batting")
                tags.add("action_shot")
            elif "bowl" in player_role.lower():
                tags.add("bowling")
                tags.add("action_shot")
            else:
                tags.add("action_shot")
                
        # Always add profile tag if it's the primary portrait picture
        if "profile" in filename.lower():
            tags.add("profile")
            tags.discard("action_shot")
            
        logger.info(f"Generated semantic tags for {filename}: {list(tags)}")
        return sorted(list(tags))
