import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "player-season-stats.json"), "r", encoding="utf-8") as f:
    ps_data = json.load(f)

batters = ps_data.get("batters", [])

print("=== VERIFYING VIRAT KOHLI STATS FOR ALL 19 SEASONS ===")

for yr in range(2008, 2027):
    season_str = str(yr)
    season_batters = [b for b in batters if str(b.get("season")) == season_str]
    sorted_batters = sorted(season_batters, key=lambda x: x.get("runs", 0), reverse=True)
    
    kohli = [b for b in season_batters if "kohli" in str(b.get("player")).lower()]
    
    top_name = sorted_batters[0].get("player") if sorted_batters else "None"
    top_runs = sorted_batters[0].get("runs") if sorted_batters else 0
    
    k_runs = kohli[0].get("runs") if kohli else "N/A"
    k_inn = kohli[0].get("innings") if kohli else "N/A"
    
    print(f"Season {season_str}: #1 {top_name} ({top_runs} runs) | Kohli: {k_runs} runs ({k_inn} inn)")
