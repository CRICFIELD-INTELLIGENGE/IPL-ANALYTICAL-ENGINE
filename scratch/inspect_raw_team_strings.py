import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "player-season-stats.json"), "r", encoding="utf-8") as f:
    ps_data = json.load(f)

b_2008 = [b for b in ps_data.get("batters", []) if str(b.get("season")) == "2008"]

teams_in_2008 = set(b.get("team") for b in b_2008)
print("All team values in 2008:", teams_in_2008)

dravid = [b for b in b_2008 if "dravid" in str(b.get("player")).lower()]
print("Dravid entry:", dravid)
