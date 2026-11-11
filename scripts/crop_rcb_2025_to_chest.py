import os
import glob
from PIL import Image

RAW_DIR = "artifacts/ipl-analytics/public/players/rcb-2025"
raw_files = glob.glob(os.path.join(RAW_DIR, "*-raw.png"))

print(f"Found {len(raw_files)} raw files to crop...")

for rf in raw_files:
    target_name = rf.replace("-raw.png", ".png")
    try:
        im = Image.open(rf).convert("RGBA")
        bbox = im.getbbox()
        if not bbox:
            print(f"Empty image: {rf}")
            continue
        
        left, top, right, bottom = bbox
        p_w = right - left
        p_h = bottom - top

        # If it's a full-body standing photo (aspect ratio height/width > 1.8), crop till chest (top ~46% of height)
        # If it's already a headshot (height/width < 1.5), keep the bounding box
        ratio = p_h / p_w if p_w > 0 else 1.0
        
        if ratio > 1.6:
            chest_bottom = int(top + p_h * 0.46)
            crop_box = (left, top, right, chest_bottom)
        elif ratio > 1.2:
            chest_bottom = int(top + p_h * 0.70)
            crop_box = (left, top, right, chest_bottom)
        else:
            crop_box = (left, top, right, bottom)
            
        cropped = im.crop(crop_box)
        # Pad slightly if needed for aesthetic presentation
        cropped.save(target_name, format="PNG")
        print(f"Cropped {os.path.basename(target_name)}: original {im.size} -> bbox {p_w}x{p_h} -> cropped {cropped.size}")
    except Exception as e:
        print(f"Error processing {rf}: {e}")

print("All 2025 cutouts cropped to chest size successfully.")
