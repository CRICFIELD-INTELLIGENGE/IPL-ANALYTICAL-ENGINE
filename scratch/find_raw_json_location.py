import os

root = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine"

for r, d, files in os.walk(root):
    json_files = [f for f in files if f.endswith(".json")]
    if len(json_files) > 10:
        print(f"Directory with {len(json_files)} JSON files: {r}")
