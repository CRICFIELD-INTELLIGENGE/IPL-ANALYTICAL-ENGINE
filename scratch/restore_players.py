import os
import shutil

repo = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine"
public_dir = os.path.join(repo, "artifacts", "ipl-analytics", "public", "data")

if not os.path.exists(public_dir):
    os.makedirs(public_dir)

src_dest_pairs = [
    (os.path.join(repo, "artifacts", "api-server", "data", "players.json"), os.path.join(public_dir, "players.json")),
    (os.path.join(repo, "artifacts", "ipl-analytics", "dist", "public", "data", "player-bio.json"), os.path.join(public_dir, "player-bio.json")),
    (os.path.join(repo, "artifacts", "ipl-analytics", "dist", "public", "data", "player-images.json"), os.path.join(public_dir, "player-images.json"))
]

for src, dest in src_dest_pairs:
    if os.path.exists(src):
        try:
            shutil.copy2(src, dest)
            print(f"Copied {src} to {dest}")
        except Exception as e:
            print(f"Error copying {src}: {e}")
    else:
        print(f"Source does not exist: {src}")
