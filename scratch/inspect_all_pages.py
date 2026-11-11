import os
import re

pages_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages"

for f in sorted(os.listdir(pages_dir)):
    if f.endswith(".tsx"):
        path = os.path.join(pages_dir, f)
        with open(path, "r", encoding="utf-8") as file:
            content = file.read()
            imgs = re.findall(r'["\']([^"\']*\.(?:jpg|png|svg|webp))["\']', content, re.IGNORECASE)
            calls = re.findall(r'resolvePlayerImage\([^)]+\)', content)
            if imgs or calls:
                print(f"=== {f} ===")
                if imgs:
                    print("  Static images:", set(imgs))
                if calls:
                    print(f"  resolvePlayerImage calls: {len(calls)}")
