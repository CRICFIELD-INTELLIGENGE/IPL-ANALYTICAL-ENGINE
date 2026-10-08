import linecache

path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\api-server\src\services\stats-aggregator.ts"

with open("scratch/filter_matches.txt", "w", encoding="utf-8") as out:
    for i in range(450, 515):
        line = linecache.getline(path, i)
        if line:
            out.write(f"L{i}: {line}")

print("Wrote lines 450-515 to scratch/filter_matches.txt")
