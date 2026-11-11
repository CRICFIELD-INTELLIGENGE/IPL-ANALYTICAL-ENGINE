import json
import os

root_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine"
data_path = os.path.join(root_dir, "artifacts", "ipl-analytics", "public", "data", "player-season-stats.json")
raw_dir = os.path.join(root_dir, "lib", "cricket-data", "raw")

print("Building player-season team mapping from 1,243 raw match files...")

# Map (player_name_lower, season_str) -> team_name
player_team_map = {}

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
                            player_team_map[(batter.lower().strip(), season)] = team
                        if bowler:
                            player_team_map[(bowler.lower().strip(), season)] = team
        except Exception:
            pass

print(f"Mapped {len(player_team_map)} player-season-team pairs!")

with open(data_path, "r", encoding="utf-8") as f:
    ps_data = json.load(f)

# Enrich batters
enriched_b = 0
for b in ps_data.get("batters", []):
    p = str(b.get("player") or "").lower().strip()
    s = str(b.get("season") or "")
    # Try exact match or partial match
    team = player_team_map.get((p, s))
    if not team:
        # try initial/lastname matching
        for (p_k, s_k), t_val in player_team_map.items():
            if s_k == s:
                p_k_parts = p_k.split()
                p_parts = p.split()
                if len(p_k_parts) > 0 and len(p_parts) > 0:
                    if p_k_parts[-1] == p_parts[-1] and p_k_parts[0][0] == p_parts[0][0]:
                        team = t_val
                        break
    if team:
        b["team"] = team
        enriched_b += 1

# Enrich bowlers
enriched_w = 0
for w in ps_data.get("bowlers", []):
    p = str(w.get("player") or "").lower().strip()
    s = str(w.get("season") or "")
    team = player_team_map.get((p, s))
    if not team:
        for (p_k, s_k), t_val in player_team_map.items():
            if s_k == s:
                p_k_parts = p_k.split()
                p_parts = p.split()
                if len(p_k_parts) > 0 and len(p_parts) > 0:
                    if p_k_parts[-1] == p_parts[-1] and p_k_parts[0][0] == p_parts[0][0]:
                        team = t_val
                        break
    if team:
        w["team"] = team
        enriched_w += 1

print(f"Enriched {enriched_b}/{len(ps_data.get('batters', []))} batters and {enriched_w}/{len(ps_data.get('bowlers', []))} bowlers with team!")

# Save updated player-season-stats.json
with open(data_path, "w", encoding="utf-8") as f:
    json.dump(ps_data, f, indent=2)

# Also update node_modules copy if exists
alt_path = os.path.join(root_dir, "node_modules", ".pnpm", "node_modules", "@workspace", "ipl-analytics", "public", "data", "player-season-stats.json")
if os.path.exists(alt_path):
    with open(alt_path, "w", encoding="utf-8") as f:
        json.dump(ps_data, f, indent=2)

print("Saved enriched player-season-stats.json!")
