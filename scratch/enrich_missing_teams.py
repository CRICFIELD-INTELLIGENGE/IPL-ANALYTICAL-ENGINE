import json
import os
import glob

RAW_DIR = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\lib\cricket-data\raw"
STATS_PATH = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\player-season-stats.json"

# Load stats
with open(STATS_PATH, "r", encoding="utf-8") as f:
    stats = json.load(f)

# Build: (player, season) -> set of teams from raw data
player_season_team = {}  # key=(player, season), value=set of teams

raw_files = glob.glob(os.path.join(RAW_DIR, "*.json"))
print(f"Processing {len(raw_files)} raw files...")

for fpath in raw_files:
    with open(fpath, "r", encoding="utf-8") as f:
        try:
            match = json.load(f)
        except Exception:
            continue
    
    info = match.get("info", {})
    season = str(info.get("season", "")).strip()
    if not season:
        continue
    # Normalize season: "2007/08" -> "2008"
    if "/" in season:
        parts = season.split("/")
        season = "20" + parts[1] if len(parts[1]) == 2 else parts[1]
    
    innings_list = match.get("innings", [])
    for inn in innings_list:
        batting_team = inn.get("team", "")
        deliveries = inn.get("overs", [])
        for over_obj in deliveries:
            for d in over_obj.get("deliveries", []):
                batter = d.get("batter", "")
                bowler = d.get("bowler", "")
                if batter:
                    key = (batter, season)
                    if key not in player_season_team:
                        player_season_team[key] = set()
                    player_season_team[key].add(batting_team)

print(f"Built mapping for {len(player_season_team)} (player, season) pairs")

# Count how many 2008 pairs exist
pairs_2008 = {k: v for k, v in player_season_team.items() if k[1] == "2008"}
print(f"2008 pairs: {len(pairs_2008)}")
for (p, s), teams in sorted(pairs_2008.items(), key=lambda x: x[0][0])[:5]:
    print(f"  {p} (2008): {teams}")

# Enrich batters
enriched_b = 0
missing_b = 0
for b in stats.get("batters", []):
    if not b.get("team"):
        player = b.get("player", "")
        season = str(b.get("season", ""))
        # Normalize season
        if "/" in season:
            parts = season.split("/")
            season = "20" + parts[1] if len(parts[1]) == 2 else parts[1]
        key = (player, season)
        teams = player_season_team.get(key)
        if teams:
            b["team"] = sorted(teams)[0]  # pick first alphabetically
            enriched_b += 1
        else:
            missing_b += 1

# Enrich bowlers
enriched_w = 0
missing_w = 0
# Also build bowler mapping
bowler_season_team = {}
for fpath in raw_files:
    with open(fpath, "r", encoding="utf-8") as f:
        try:
            match = json.load(f)
        except Exception:
            continue
    info = match.get("info", {})
    season = str(info.get("season", "")).strip()
    if not season:
        continue
    if "/" in season:
        parts = season.split("/")
        season = "20" + parts[1] if len(parts[1]) == 2 else parts[1]
    innings_list = match.get("innings", [])
    for inn in innings_list:
        batting_team = inn.get("team", "")
        teams_in_match = match.get("info", {}).get("teams", [])
        bowling_team = next((t for t in teams_in_match if t != batting_team), "")
        for over_obj in inn.get("overs", []):
            for d in over_obj.get("deliveries", []):
                bowler = d.get("bowler", "")
                if bowler:
                    key = (bowler, season)
                    if key not in bowler_season_team:
                        bowler_season_team[key] = set()
                    bowler_season_team[key].add(bowling_team)

for b in stats.get("bowlers", []):
    if not b.get("team"):
        player = b.get("player", "")
        season = str(b.get("season", ""))
        if "/" in season:
            parts = season.split("/")
            season = "20" + parts[1] if len(parts[1]) == 2 else parts[1]
        key = (player, season)
        teams = bowler_season_team.get(key)
        if teams:
            b["team"] = sorted(teams)[0]
            enriched_w += 1
        else:
            missing_w += 1

print(f"\nEnriched batters: {enriched_b}, Missing: {missing_b}")
print(f"Enriched bowlers: {enriched_w}, Missing: {missing_w}")

# Save
with open(STATS_PATH, "w", encoding="utf-8") as f:
    json.dump(stats, f, separators=(",", ":"))
print("Saved player-season-stats.json")

# Verify
b_2008 = [b for b in stats.get("batters", []) if str(b.get("season")) == "2008"]
with_team = [b for b in b_2008 if b.get("team")]
print(f"\n2008 batter records: {len(b_2008)}, With team: {len(with_team)}")

def is_rcb(team):
    if not team: return False
    t = str(team).lower()
    return "bangalore" in t or "bengaluru" in t or "rcb" in t or "royal challengers" in t

rcb_2008 = [b for b in b_2008 if is_rcb(b.get("team"))]
print(f"2008 RCB records: {len(rcb_2008)}")
for b in sorted(rcb_2008, key=lambda x: x.get("runs", 0), reverse=True)[:8]:
    print(f"  {b.get('player')}: {b.get('runs')} runs, team={b.get('team')}")
