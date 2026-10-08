import json
import os

data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"

with open(os.path.join(data_dir, "player-season-stats.json"), "r", encoding="utf-8") as f:
    ps_data = json.load(f)

# Let's inspect raw delivery files or matches to build player-season-team map!
raw_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\lib\cricket-data\raw"

player_season_teams = {} # (player, season) -> Set of teams

if os.path.exists(raw_dir):
    files = [f for f in os.listdir(raw_dir) if f.endswith(".json")]
    print(f"Found {len(files)} raw match files")
    for fname in files:
        with open(os.path.join(raw_dir, fname), "r", encoding="utf-8") as f:
            m = json.load(f)
            info = m.get("info", {})
            season = str(info.get("season") or "")
            if not season: continue
            for inn in m.get("innings", []):
                team = inn.get("team")
                for over in inn.get("overs", []):
                    for d in over.get("deliveries", []):
                        batter = d.get("batter")
                        if batter:
                            key = (batter.lower().strip(), season)
                            if key not in player_season_teams:
                                player_season_teams[key] = set()
                            player_season_teams[key].add(team)

print(f"Total player-season team entries mapped: {len(player_season_teams)}")

# Check 2008 RCB batters
rcb_2008_batters = []
for (p_name, s), t_set in player_season_teams.items():
    if s == "2008":
        if any("bangalore" in t.lower() or "bengaluru" in t.lower() or "rcb" in t.lower() for t in t_set):
            rcb_2008_batters.append(p_name)

print(f"\nRCB 2008 Batters count: {len(rcb_2008_batters)}")
print("RCB 2008 Batters:", rcb_2008_batters[:15])
