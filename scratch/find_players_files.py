import os

repo = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine"
print("Searching for players files...")

for root, dirs, files in os.walk(repo):
    for f in files:
        if f in ["player-bio.json", "player-images.json", "players.json", "current-squads.json"]:
            full = os.path.join(root, f)
            print(f"Found: {full} ({os.path.getsize(full)} bytes)")
