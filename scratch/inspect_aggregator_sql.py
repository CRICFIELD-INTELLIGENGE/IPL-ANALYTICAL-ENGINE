import re

path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src\services\stats-aggregator.ts"

with open(path, "r", encoding="utf-8") as f:
    text = f.read()

print("=== SEARCHING FOR SQL QUERIES IN stats-aggregator.ts ===")
matches = re.findall(r'sql`[^`]+`', text)
print(f"Total SQL tagged templates found: {len(matches)}")
for m in matches[:10]:
    print("--- SQL QUERY ---")
    print(m[:250])
