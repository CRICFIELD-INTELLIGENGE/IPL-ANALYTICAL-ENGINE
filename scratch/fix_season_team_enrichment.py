import json
import os
import re

root_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine"
data_path = os.path.join(root_dir, "artifacts", "ipl-analytics", "public", "data", "player-season-stats.json")
raw_dir = os.path.join(root_dir, "lib", "cricket-data", "raw")

def clean_season(s):
    if not s: return ""
    nums = re.findall(r'\d{4}', str(s))
    if nums: return nums[0]
    nums2 = re.findall(r'\d{2}', str(s))
    if len(nums2) >= 2: return "20" + nums2[-1] if int(nums2[-1]) < 50 else "19" + nums2[-1]
    return str(s).strip()

print("Building team map from 1,243 raw files with normalized season...")

player_season_teams = {}

raw_files = [f for f in os.listdir(raw_dir) if f.endswith(".json")]
for fname in raw_files:
    fp = os.path.join(raw_dir, fname)
    with open(fp, "r", encoding="utf-8") as f:
        try:
            m = json.load(f)
            season = clean_season(m.get("info", {}).get("season"))
            if not season: continue
            
            # Map from info.players
            players_dict = m.get("info", {}).get("players", {})
            for team, p_list in players_dict.items():
                for p in p_list:
                    player_season_teams[(p.strip(), season)] = team
                    
            # Map from deliveries
            for inn in m.get("innings", []):
                team = inn.get("team")
                if not team: continue
                for over in inn.get("overs", []):
                    for d in over.get("deliveries", []):
                        b = d.get("batter")
                        w = d.get("bowler")
                        if b: player_season_teams[(b.strip(), season)] = team
                        if w: player_season_teams[(w.strip(), season)] = team
        except Exception:
            pass

print(f"Total player-season team mappings: {len(player_season_teams)}")

def norm(s):
    return (s or "").lower().replace(".", "").replace("-", " ").strip()

def last_name(s):
    p = norm(s).split()
    return p[-1] if p else ""

def first_init(s):
    p = norm(s).split()
    return p[0][0] if p else ""

fuzzy_map = {}
for (p_name, s), t in player_season_teams.items():
    fuzzy_map[(last_name(p_name), first_init(p_name), s)] = t

with open(data_path, "r", encoding="utf-8") as f:
    ps_data = json.load(f)

b_enriched = 0
for b in ps_data.get("batters", []):
    p = b.get("player", "")
    s = clean_season(b.get("season"))
    t = player_season_teams.get((p, s))
    if not t:
        t = fuzzy_map.get((last_name(p), first_init(p), s))
    if t:
        b["team"] = t
        b_enriched += 1

w_enriched = 0
for w in ps_data.get("bowlers", []):
    p = w.get("player", "")
    s = clean_season(w.get("season"))
    t = player_season_teams.get((p, s))
    if not t:
        t = fuzzy_map.get((last_name(p), first_init(p), s))
    if t:
        w["team"] = t
        w_enriched += 1

print(f"SUCCESS! Enriched {b_enriched}/{len(ps_data.get('batters', []))} batters and {w_enriched}/{len(ps_data.get('bowlers', []))} bowlers!")

# Save to public/data/player-season-stats.json
with open(data_path, "w", encoding="utf-8") as f:
    json.dump(ps_data, f, indent=2)

alt_path = os.path.join(root_dir, "node_modules", ".pnpm", "node_modules", "@workspace", "ipl-analytics", "public", "data", "player-season-stats.json")
if os.path.exists(alt_path):
    with open(alt_path, "w", encoding="utf-8") as f:
        json.dump(ps_data, f, indent=2)

print("Saved enriched file!")
