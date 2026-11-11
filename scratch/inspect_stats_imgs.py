import re

stats_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\stats.tsx"

with open(stats_path, "r", encoding="utf-8") as f:
    content = f.read()

print("=== IMAGE / BANNER USAGES IN STATS.TSX ===")

# Find img tags and their src attributes
img_tags = re.findall(r'<img[^>]+src=\{?["\']?([^"\'\s>\}]+)["\']?\}?[^>]*>', content)
for src in img_tags:
    print("img src:", src)

# Find all occurrences of resolvePlayerImage
print("\n=== resolvePlayerImage CALLS ===")
for m in re.finditer(r'resolvePlayerImage\(([^)]+)\)', content):
    print("Call:", m.group(0))

# Find references to background images or hero/banners
print("\n=== BANNER OR BACKGROUND USAGES ===")
for line_no, line in enumerate(content.splitlines(), 1):
    if any(term in line.lower() for term in ["bg-", "banner", "hero", "header", "title", "heatmap", "venue", "logo"]):
        if "<img" in line or "src=" in line or "url(" in line:
            print(f"L{line_no}: {line.strip()[:140]}")
