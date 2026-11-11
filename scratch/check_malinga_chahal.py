import os
import json

json_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\player-images.json"

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

print("=== SEARCH FOR MALINGA & CHAHAL IN player-images.json ===")
for k, v in data.items():
    if any(term in k.lower() for term in ["malinga", "chahal", "lasith", "yuzvendra"]):
        print(f"'{k}' -> {v}")

