import os

src_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src"

replacements = {
    # Replace external default player stats image URL with local player image
    "https://scores.iplt20.com/ipl/images/default-player-statsImage.png": "/virat kohli.jpg",
    # Clean up /src/assets/ if any remain
    "/src/assets/": "/"
}

count = 0
for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith(".tsx") or f.endswith(".ts"):
            path = os.path.join(root, f)
            with open(path, "r", encoding="utf-8") as file:
                content = file.read()
            
            modified = content
            for old, new in replacements.items():
                if old in modified:
                    modified = modified.replace(old, new)
            
            if modified != content:
                print(f"Updating image references in: {os.path.basename(path)}")
                with open(path, "w", encoding="utf-8") as file:
                    file.write(modified)
                count += 1

print(f"Completed updating image references across {count} files!")
