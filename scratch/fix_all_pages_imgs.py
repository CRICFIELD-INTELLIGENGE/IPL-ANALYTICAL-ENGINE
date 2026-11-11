import os

pages_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages"

for f in os.listdir(pages_dir):
    if f.endswith(".tsx") or f.endswith(".ts"):
        path = os.path.join(pages_dir, f)
        with open(path, "r", encoding="utf-8") as file:
            content = file.read()
        if "/src/assets/" in content:
            print(f"Replacing /src/assets/ in {f}...")
            content = content.replace("/src/assets/", "/")
            with open(path, "w", encoding="utf-8") as file:
                file.write(content)

print("Done checking all page files!")
