import linecache

venue_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\pages\venue.tsx"

for i in range(25, 110):
    line = linecache.getline(venue_path, i)
    if line:
        print(f"L{i}: {line.rstrip()}")
