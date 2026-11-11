import os
import json
import glob

print("=== CHECKING player-images.json IN ENTIRE REPO ===")
for root, dirs, files in os.walk("."):
    if "node_modules" in root or ".git" in root:
        continue
    for f in files:
        if f == "player-images.json":
            p = os.path.join(root, f)
            print("Found player-images.json at:", p)
            with open(p, "r", encoding="utf-8") as jf:
                data = json.load(jf)
                print(f"Contains {len(data)} entries.")
                print("Sample keys:", list(data.keys())[:10])

