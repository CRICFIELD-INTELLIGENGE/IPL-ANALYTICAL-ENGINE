import json
import os

root_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine"
data_path = os.path.join(root_dir, "artifacts", "ipl-analytics", "public", "data", "player-season-stats.json")
raw_dir = os.path.join(root_dir, "lib", "cricket-data", "raw")

raw_files = [f for f in os.listdir(raw_dir) if f.endswith(".json")]
print(f"Scanning {len(raw_files)} raw match files for batter team associations...")

# Map (batter_exact_name, season) -> team
batter_season_team = {}
bowler_season_team = {}

for fname in raw_files:
    fp = os.path.join(raw_dir, fname)
    with open(fp, "r", encoding="utf-8") as f:
        try:
            m = json.load(f)
            season = str(m.get("info", {}).get("season") or "")
            if not season: continue
            for inn in m.get("innings", []):
                team = inn.get("team")
                if not team: continue
                for over in inn.get("overs", []):
                    for d in over.get("deliveries", []):
                        b = d.get("batter")
                        w = d.get("bowler")
                        if b: batter_season_team[(b, season)] = team
                        if w: bowler_season_team[(w, season)] = team
        except Exception:
            pass

print(f"Mapped {len(batter_season_team)} batter-season teams and {len(bowler_season_team)} bowler-season teams!")

with open(data_path, "r", encoding="utf-8") as f:
    ps_data = json.load(f)

# Normalize helper for fuzzy matching
def norm(s):
    return (s or "").lower().replace(".", "").replace("-", " ").strip()

def last_name(s):
    p = norm(s).split()
    return p[-1] if p else ""

def first_init(s):
    p = norm(s).split()
    return p[0][0] if p else ""

# Map (last_name, first_init, season) -> team
fuzzy_batter_map = {}
for (b_name, s), t in batter_season_team.items():
    fuzzy_batter_map[(last_name(b_name), first_init(b_name), s)] = t

fuzzy_bowler_map = {}
for (w_name, s), t in bowler_season_team.items():
    fuzzy_bowler_map[(last_name(w_name), first_init(w_name), s)] = t

enriched_b = 0
for b in ps_data.get("batters", []):
    p = b.get("player", "")
    s = str(b.get("season", ""))
    t = batter_season_team.get((p, s))
    if not t:
        t = fuzzy_batter_map.get((last_name(p), first_init(p), s))
    if t:
        b["team"] = t
        enriched_b += 1

enriched_w = 0
for w in ps_data.get("bowlers", []):
    p = w.get("player", "")
    s = str(w.get("season", ""))
    t = bowler_season_team.get((p, s))
    if not t:
        t = fuzzy_bowler_map.get((last_name(p), first_init(p), s))
    if t:
        w["team"] = t
        enriched_w += 1

print(f"SUCCESS! Enriched {enriched_b}/{len(ps_data.get('batters', []))} batters and {enriched_w}/{len(ps_data.get('bowlers', []))} bowlers!")

# Save to public/data/player-season-stats.json
with open(data_path, "w", encoding="utf-8") as f:
    json.dump(ps_data, f, indent=2)

alt_path = os.path.join(root_dir, "node_modules", ".pnpm", "node_modules", "@workspace", "ipl-analytics", "public", "data", "player-season-stats.json")
if os.path.exists(alt_path):
    with open(alt_path, "w", encoding="utf-8") as f:
        json.dump(ps_data, f, indent=2)
