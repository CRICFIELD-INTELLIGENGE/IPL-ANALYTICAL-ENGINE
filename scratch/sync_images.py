import os
import shutil

src_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\image players"
pub_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public"
assets_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\assets"

os.makedirs(pub_dir, exist_ok=True)
os.makedirs(assets_dir, exist_ok=True)

files = os.listdir(src_dir)
print(f"Syncing {len(files)} files from image players...")

copied_pub = 0
copied_assets = 0

for f in files:
    src_file = os.path.join(src_dir, f)
    if os.path.isfile(src_file):
        pub_file = os.path.join(pub_dir, f)
        assets_file = os.path.join(assets_dir, f)

        shutil.copy2(src_file, pub_file)
        copied_pub += 1

        shutil.copy2(src_file, assets_file)
        copied_assets += 1

print(f"Copied {copied_pub} files to public/ and {copied_assets} files to src/assets/")
