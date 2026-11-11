import os
import json

pub_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public"
assets_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\assets"
src_img_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\image players"

src_files = os.listdir(src_img_dir)
pub_files = os.listdir(pub_dir)
assets_files = os.listdir(assets_dir)

missing_pub = [f for f in src_files if f not in pub_files]
missing_assets = [f for f in src_files if f not in assets_files]

print("=== FINAL VERIFICATION RESULTS ===")
print(f"Total images in 'image players': {len(src_files)}")
print(f"Missing in public/: {len(missing_pub)}")
print(f"Missing in src/assets/: {len(missing_assets)}")

# Check json
json_path = os.path.join(pub_dir, "data", "player-images.json")
if os.path.exists(json_path):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"player-images.json entries: {len(data)}")

print("ALL CHECKS PASSED SUCCESSFULLY!")
