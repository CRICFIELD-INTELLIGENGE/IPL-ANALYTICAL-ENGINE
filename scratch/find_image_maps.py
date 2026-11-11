import os
import json
import glob

# Search for player-images.json or any player image maps in the codebase
print("=== SEARCHING FOR PLAYER IMAGE FILES OR REFERENCES ===")
for root, dirs, files in os.walk("."):
    if "node_modules" in root or ".git" in root or "dist" in root:
        continue
    for f in files:
        if "player" in f.lower() and "image" in f.lower():
            p = os.path.join(root, f)
            print("Found file:", p)
            if f.endsWith(".json"):
                with open(p, "r", encoding="utf-8") as jf:
                    data = json.load(jf)
                    print("  Keys count:", len(data))
                    print("  Sample:", list(data.items())[:5])

