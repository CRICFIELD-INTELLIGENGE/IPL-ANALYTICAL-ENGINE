import os

root_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts"

matches = []

for r, d, files in os.walk(root_dir):
    for f in files:
        if f.endswith((".ts", ".tsx", ".js", ".json")):
            p = os.path.join(r, f)
            with open(p, "r", encoding="utf-8", errors="ignore") as file:
                text = file.read()
                if "isKohli" in text or "9336" in text:
                    matches.append((p, text.count("isKohli"), text.count("9336")))

print(f"Total files with isKohli or 9336: {len(matches)}")
for p, count1, count2 in matches:
    print(f"{p} -> isKohli count: {count1}, 9336 count: {count2}")
