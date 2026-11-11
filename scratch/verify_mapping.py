import os
import json

src_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\image players"
pub_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public"
assets_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\assets"
json_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data\player-images.json"

src_files = os.listdir(src_dir)
pub_files = os.listdir(pub_dir)
assets_files = os.listdir(assets_dir)

missing_pub = [f for f in src_files if f not in pub_files]
missing_assets = [f for f in src_files if f not in assets_files]

print("=== VERIFICATION RESULTS ===")
print(f"Total source images: {len(src_files)}")
print(f"Missing in public/: {len(missing_pub)} -> {missing_pub}")
print(f"Missing in src/assets/: {len(missing_assets)} -> {missing_assets}")

if os.path.exists(json_path):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"player-images.json exists with {len(data)} entries.")
    print("Sample mappings:")
    for k in ["Virat Kohli", "Jasprit Bumrah", "Abhishek Sharma", "Bhuvneshwar Kumar", "Mayank Yadav", "MS Dhoni"]:
        if k in data:
            print(f"  {k} -> {data[k]}")
else:
    print("ERROR: player-images.json not found!")
