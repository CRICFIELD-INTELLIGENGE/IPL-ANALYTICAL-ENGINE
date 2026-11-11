import json
import os

root_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine"
data_path = os.path.join(root_dir, "artifacts", "ipl-analytics", "public", "data", "player-season-stats.json")
raw_dir = os.path.join(root_dir, "lib", "cricket-data", "raw")

# Build player-season -> team from raw files
player_season_teams = {}

raw_files = [f for f in os.listdir(raw_dir) if f.endswith(".json")]
for fname in raw_files:
    with open(os.path.join(raw_dir, fname), "r", encoding="utf-8") as f:
        try:
            m = json.load(f)
            season = str(m.get("info", {}).get("season") or "")
            if not season: continue
            for inn in m.get("innings", []):
                team = inn.get("team")
                if not team: continue
                for over in inn.get("overs", []):
                    for d in over.get("deliveries", []):
                        batter = d.get("batter")
                        bowler = d.get("bowler")
                        if batter:
                            player_season_teams[(batter, season)] = team
                        if bowler:
                            player_season_teams[(bowler, season)] = team
        except Exception:
            pass

def clean_name(n):
    return (n or "").lower().replace(".", "").replace("-", " ").strip()

def last_name(n):
    parts = clean_name(n).split()
    return parts[-1] if parts else ""

def first_init(n):
    parts = clean_name(n).split()
    return parts[0][0] if parts else ""

# Map by (last_name, first_init, season) -> team
name_lookup = {}
for (p, s), team in player_season_teams.items():
    key = (last_name(p), first_init(p), s)
    name_lookup[key] = team

with open(data_path, "r", encoding="utf-8") as f:
    ps_data = json.load(f)

enriched_batters = 0
for b in ps_data.get("batters", []):
    p = b.get("player", "")
    s = str(b.get("season", ""))
    team = player_season_teams.get((p, s))
    if not team:
        team = name_lookup.get((last_name(p), first_init(p), s))
    if team:
        b["team"] = team
        enriched_batters += 1

enriched_bowlers = 0
for w in ps_data.get("bowlers", []):
    p = w.get("player", "")
    s = str(w.get("season", ""))
    team = player_season_teams.get((p, s))
    if not team:
        team = name_lookup.get((last_name(p), first_init(p), s))
    if team:
        w["team"] = team
        enriched_bowlers += 1

print(f"Enriched {enriched_batters}/{len(ps_data.get('batters', []))} batters and {enriched_bowlers}/{len(ps_data.get('bowlers', []))} bowlers!")

with open(data_path, "w", encoding="utf-8") as f:
    json.dump(ps_data, f, indent=2)

# Copy to node_modules if present
alt_path = os.path.join(root_dir, "node_modules", ".pnpm", "node_modules", "@workspace", "ipl-analytics", "public", "data", "player-season-stats.json")
if os.path.exists(alt_path):
    with open(alt_path, "w", encoding="utf-8") as f:
        json.dump(ps_data, f, indent=2)
