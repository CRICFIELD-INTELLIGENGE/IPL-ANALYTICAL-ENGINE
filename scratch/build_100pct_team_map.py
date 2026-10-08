import json
import os

root_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine"
data_path = os.path.join(root_dir, "artifacts", "ipl-analytics", "public", "data", "player-season-stats.json")
raw_dir = os.path.join(root_dir, "lib", "cricket-data", "raw")

# Build map: (name_clean, season) -> team
player_team_map = {}

raw_files = [f for f in os.listdir(raw_dir) if f.endswith(".json")]
print(f"Processing {len(raw_files)} raw files for info.players...")

for fname in raw_files:
    with open(os.path.join(raw_dir, fname), "r", encoding="utf-8") as f:
        try:
            m = json.load(f)
            info = m.get("info", {})
            season = str(info.get("season") or "")
            if not season: continue
            
            # Map from info.players
            players_dict = info.get("players", {})
            for team, p_list in players_dict.items():
                for p in p_list:
                    player_team_map[(p.lower().strip(), season)] = team
                    
            # Also map from deliveries
            for inn in m.get("innings", []):
                team = inn.get("team")
                if not team: continue
                for over in inn.get("overs", []):
                    for d in over.get("deliveries", []):
                        b = d.get("batter")
                        w = d.get("bowler")
                        if b: player_team_map[(b.lower().strip(), season)] = team
                        if w: player_team_map[(w.lower().strip(), season)] = team
        except Exception:
            pass

print(f"Total entries in player_team_map: {len(player_team_map)}")

def norm(n):
    return (n or "").lower().replace(".", "").replace("-", " ").strip()

def last_name(n):
    parts = norm(n).split()
    return parts[-1] if parts else ""

def first_init(n):
    parts = norm(n).split()
    return parts[0][0] if parts else ""

# Helper to find team for a player in a season
def find_team(p_name, season):
    p_clean = p_name.lower().strip()
    s = str(season)
    if (p_clean, s) in player_team_map:
        return player_team_map[(p_clean, s)]
    
    ln = last_name(p_name)
    fi = first_init(p_name)
    
    # search player_team_map
    for (k_name, k_season), team in player_team_map.items():
        if k_season == s:
            if last_name(k_name) == ln and first_init(k_name) == fi:
                return team
    return None

with open(data_path, "r", encoding="utf-8") as f:
    ps_data = json.load(f)

b_count = 0
for b in ps_data.get("batters", []):
    t = find_team(b.get("player", ""), b.get("season", ""))
    if t:
        b["team"] = t
        b_count += 1

w_count = 0
for w in ps_data.get("bowlers", []):
    t = find_team(w.get("player", ""), w.get("season", ""))
    if t:
        w["team"] = t
        w_count += 1

print(f"SUCCESS! Enriched {b_count}/{len(ps_data.get('batters', []))} batters and {w_count}/{len(ps_data.get('bowlers', []))} bowlers!")

with open(data_path, "w", encoding="utf-8") as f:
    json.dump(ps_data, f, indent=2)

# Copy to node_modules if present
alt_path = os.path.join(root_dir, "node_modules", ".pnpm", "node_modules", "@workspace", "ipl-analytics", "public", "data", "player-season-stats.json")
if os.path.exists(alt_path):
    with open(alt_path, "w", encoding="utf-8") as f:
        json.dump(ps_data, f, indent=2)
