import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "player-season-stats.json"), "r", encoding="utf-8") as f:
    ps_data = json.load(f)

batters = ps_data.get("batters", [])

b_2008 = [b for b in batters if str(b.get("season")) == "2008"]

print("Sample 2008 Batter entry:", b_2008[0] if b_2008 else "None")

# Check if team property exists on any batter
batters_with_team = [b for b in batters if b.get("team")]
print(f"Total batters in file: {len(batters)}, batters with 'team': {len(batters_with_team)}")
if batters_with_team:
    print("Sample batter with team:", batters_with_team[0])
