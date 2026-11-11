import json

json_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\player-images.json"

with open(json_path, "r", encoding="utf-8") as f:
    player_images = json.load(f)

test_names = [
    "Lasith Malinga", "SL Malinga", "L Malinga", "Malinga",
    "Yuzvendra Chahal", "YS Chahal", "Y Chahal", "Chahal"
]

print("=== TESTING MALINGA & CHAHAL RESOLUTION ===")
for name in test_names:
    res = player_images.get(name) or player_images.get(name.lower())
    print(f"Name: '{name}' -> Image URL: {res}")
