import os
import json

img_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\image players"
top_b_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\top-batters.json"
top_w_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\top-bowlers.json"
career_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\player-career-stats.json"

all_names = set()

for path in [top_b_path, top_w_path, career_path]:
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            def scan(obj):
                if isinstance(obj, dict):
                    for k, v in obj.items():
                        if k in ["player", "playerName", "holder"] and isinstance(v, str):
                            all_names.add(v)
                        scan(v)
                elif isinstance(obj, list):
                    for item in obj:
                        scan(item)
            scan(data)

print(f"Total unique player names in dataset: {len(all_names)}")

# Now for each player image file in image players, find matching names in dataset!
files = [f for f in os.listdir(img_dir) if any(f.endswith(ext) for ext in [".jpg", ".png"])]

mapping = {}

keywords_map = {
    "lasith malinga": ["malinga", "sl malinga", "l malinga", "lasith malinga"],
    "y chahal": ["chahal", "ys chahal", "y chahal", "yuzvendra chahal"],
    "a mishra": ["mishra", "a mishra", "amit mishra"],
    "a rahane": ["rahane", "a rahane", "ajinkya rahane"],
    "ab devillers": ["villiers", "devillers", "ab de villiers", "abd"],
    "abhisek sharma": ["abhishek", "abhisek", "abhishek sharma", "a sharma"],
    "bhuvaneswar kumar": ["bhuvneshwar", "bhuvaneshwar", "bhuvaneswar", "b kumar"],
    "bumrah": ["bumrah", "j bumrah", "jasprit bumrah"],
    "c gayle": ["gayle", "c gayle", "chris gayle"],
    "d warner": ["warner", "d warner", "david warner"],
    "dj bravo": ["bravo", "dj bravo", "dwayne bravo"],
    "kl rahul": ["kl rahul", "k l rahul", "rahul"],
    "mayank yadav": ["mayank yadav", "m yadav"],
    "msd": ["dhoni", "msd", "ms dhoni", "m s dhoni"],
    "p chawla": ["chawla", "p chawla", "piyush chawla"],
    "r ashwin": ["ashwin", "r ashwin", "ravichandran ashwin"],
    "r jadeja": ["jadeja", "r jadeja", "ravindra jadeja"],
    "rashid khan": ["rashid", "rashid khan"],
    "rohit sharma": ["rohit", "rohit sharma", "rg sharma"],
    "s narine": ["narine", "s narine", "sunil narine"],
    "sanju samson": ["samson", "sanju samson", "sv samson"],
    "shikhar dhawan": ["dhawan", "shikhar dhawan", "s dhawan"],
    "suresh raina": ["raina", "suresh raina", "s raina", "sk raina"],
    "virat kohli": ["kohli", "virat kohli", "v kohli"],
    "virat-kohli": ["kohli", "virat kohli"]
}

final_player_images = {}

for f in files:
    base = os.path.splitext(f)[0].lower()
    if base in keywords_map:
        kw_list = keywords_map[base]
        # Match against dataset names
        for dataset_name in all_names:
            dn_lower = dataset_name.lower()
            if any(kw in dn_lower for kw in kw_list):
                final_player_images[dataset_name] = f"/{f}"

        # Also add explicit key variants
        for kw in kw_list:
            final_player_images[kw] = f"/{f}"
            final_player_images[kw.title()] = f"/{f}"

print(f"\nTotal final player image mappings generated: {len(final_player_images)}")
print("\nSample mappings for Malinga and Chahal:")
for k, v in final_player_images.items():
    if "malinga" in k.lower() or "chahal" in k.lower():
        print(f"  '{k}' -> {v}")

with open(r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\player-images.json", "w", encoding="utf-8") as out:
    json.dump(final_player_images, out, indent=2)

print("\nSuccessfully updated player-images.json!")
