import os
import json
import re

img_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\image players"
pub_data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"
out_json_path = os.path.join(pub_data_dir, "player-images.json")

player_map = {}

files = sorted(os.listdir(img_dir))
print(f"Total files in image players: {len(files)}")

for f in files:
    if not any(f.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
        continue
    
    # Ignore banners/logos from player dictionary
    if any(k in f.lower() for k in ["banner", "logo", "title", "hero", "feed", "heatmap", "venue", "insight", "media"]):
        continue
    
    # Clean filename into player name
    base_name = os.path.splitext(f)[0]
    name_clean = base_name.replace("-", " ").replace("_", " ").strip()
    
    # Capitalize words
    player_name = " ".join(word.capitalize() for word in name_clean.split())
    
    img_url = f"/{f}"
    
    # Add exact name mapping
    player_map[player_name] = img_url
    player_map[base_name] = img_url
    player_map[base_name.lower()] = img_url
    
    # Common initials
    parts = player_name.split()
    if len(parts) >= 2:
        first_init = parts[0][0]
        last_name = parts[-1]
        player_map[f"{first_init} {last_name}"] = img_url
        player_map[f"{first_init}. {last_name}"] = img_url
        player_map[f"{first_init}.{last_name}"] = img_url

print(f"Generated {len(player_map)} player mappings.")
with open(out_json_path, "w", encoding="utf-8") as out_f:
    json.dump(player_map, out_f, indent=2)

print("Updated player-images.json successfully!")
