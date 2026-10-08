import json
import re

transcript_path = r"C:\Users\KIIT0001\.gemini\antigravity\brain\edfbe3c6-07a5-4ea0-83a9-a565c340aefe\.system_generated\logs\transcript_full.jsonl"
with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        if '"step_index":1087' in line:
            data = json.loads(line)
            content = data.get("content", "")
            break

print("Content length:", len(content))
start_marker = "video_id,title,video_type"
idx = content.find(start_marker)
print("Header idx:", idx)
if idx != -1:
    snippet = content[idx:idx+500]
    print("Snippet:", repr(snippet))
