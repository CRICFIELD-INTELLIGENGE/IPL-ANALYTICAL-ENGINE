import json
import os

data_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\player-season-stats.json"
with open(data_path, "r", encoding="utf-8") as f:
    data = json.load(f)

batters = data.get("batters", [])
# Get 2008 batters
b_2008 = [b for b in batters if str(b.get("season")) == "2008"]
print(f"Total 2008 batter records: {len(b_2008)}")

# Check how many have 'team' field
with_team = [b for b in b_2008 if b.get("team")]
without_team = [b for b in b_2008 if not b.get("team")]
print(f"With team: {len(with_team)}, Without team: {len(without_team)}")

# Sample first few records
print("\nFirst 5 with team:")
for b in sorted(with_team, key=lambda x: x.get("runs",0), reverse=True)[:5]:
    print(f"  {b.get('player')}: {b.get('runs')} runs, team='{b.get('team')}'")

print("\nFirst 5 without team:")
for b in without_team[:5]:
    print(f"  {b.get('player')}: {b.get('runs')} runs")

# Check specifically RCB players in 2008
def is_rcb(team):
    if not team: return False
    t = str(team).lower()
    return "bangalore" in t or "bengaluru" in t or "rcb" in t or "royal challengers" in t

rcb_2008 = [b for b in b_2008 if is_rcb(b.get("team"))]
print(f"\n2008 RCB batter records: {len(rcb_2008)}")
for b in sorted(rcb_2008, key=lambda x: x.get("runs",0), reverse=True)[:8]:
    print(f"  {b.get('player')}: {b.get('runs')} runs")

# Check Shaun Marsh, Gambhir in 2008
for name in ["S Marsh", "Shaun Marsh", "G Gambhir", "Gambhir", "Jayasuriya", "SC Ganguly"]:
    matches = [b for b in b_2008 if name.lower() in (b.get("player") or "").lower()]
    for m in matches:
        print(f"\n  FOUND: {m.get('player')}: {m.get('runs')} runs, team='{m.get('team')}'")
