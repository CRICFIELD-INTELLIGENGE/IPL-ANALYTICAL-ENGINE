import linecache

path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src\services\stats-aggregator.ts"

with open("scratch/filter_matches_body.txt", "w", encoding="utf-8") as out:
    for i in range(380, 440):
        line = linecache.getline(path, i)
        if line:
            out.write(f"L{i}: {line}")

print("Wrote lines 380-440 to scratch/filter_matches_body.txt")
