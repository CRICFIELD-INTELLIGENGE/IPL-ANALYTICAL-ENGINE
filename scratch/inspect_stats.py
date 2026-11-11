import os
import json
import re

img_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\image players"
pub_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public"
stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

print("=== FILES IN image players ===")
img_files = sorted(os.listdir(img_dir))
for f in img_files:
    print(" -", f)

print("\n=== FILES IN public ===")
pub_files = sorted(os.listdir(pub_dir))
for f in pub_files:
    print(" -", f)

with open(stats_path, "r", encoding="utf-8") as f:
    stats_content = f.read()

print(f"\nStats.tsx line count: {len(stats_content.splitlines())}")

# Search for player objects or image fields in stats.tsx
image_refs = set(re.findall(r'["\'](/[^"\']+\.(?:jpg|jpeg|png|svg|webp))["\']', stats_content, re.IGNORECASE))
print("\nImage references found in stats.tsx:")
for r in sorted(image_refs):
    print(" -", r)
