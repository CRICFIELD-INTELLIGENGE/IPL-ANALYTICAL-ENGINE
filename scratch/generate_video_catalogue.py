import json
import csv
import io
import re
import os

transcript_path = r"C:\Users\KIIT0001\.gemini\antigravity\brain\edfbe3c6-07a5-4ea0-83a9-a565c340aefe\.system_generated\logs\transcript_full.jsonl"
output_json_path = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\src\data\video-catalogue.json"

print(f"Reading transcript from {transcript_path}...")
with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        if '"step_index":1087' in line:
            data = json.loads(line)
            content = data.get("content", "")
            break

# Locate header
header_marker = "video_id,title,video_type,original_category"
header_idx = content.find(header_marker)

end_marker = "DELIVERABLE C — JSON DATABASE"
end_idx = content.find(end_marker)

raw_csv = content[header_idx:end_idx].strip()

# Replace spaces before V2026- with newlines
clean_csv = re.sub(r'[\r\n\s]+(V2026-\d{3})', r'\n\1', raw_csv)

reader = csv.DictReader(io.StringIO(clean_csv))
items = []

OFFICIAL_HUB_URL = "https://www.hotstar.com/in/sports/cricket/tournaments/indian-premier-league/1271507153"

# Known canonical deep URLs
CANONICAL_DEEP_URLS = {
    "V2026-006": "https://www.hotstar.com/in/sports/cricket/kohlis-75-vs-gt-in-final/1271647455/watch",
    "V2026-011": "https://www.hotstar.com/in/sports/cricket/rcb-vs-gt-highlights-final/1540067138/video/highlights/watch"
}

TEAM_MAP = {
    "RCB": "RCB", "ROYAL CHALLENGERS BENGALURU": "RCB", "ROYAL CHALLENGERS BANGALORE": "RCB",
    "CSK": "CSK", "CHENNAI SUPER KINGS": "CSK",
    "MI": "MI", "MUMBAI INDIANS": "MI",
    "KKR": "KKR", "KOLKATA KNIGHT RIDERS": "KKR",
    "GT": "GT", "GUJARAT TITANS": "GT",
    "RR": "RR", "RAJASTHAN ROYALS": "RR",
    "DC": "DC", "DELHI CAPITALS": "DC",
    "PBKS": "PBKS", "PUNJAB KINGS": "PBKS",
    "SRH": "SRH", "SUNRISERS HYDERABAD": "SRH",
    "LSG": "LSG", "LUCKNOW SUPER GIANTS": "LSG"
}

def clean_val(v):
    if v is None:
        return None
    v = v.strip()
    if v == "null" or v == "" or v == "None":
        return None
    return v

def parse_list(v):
    if not v:
        return []
    cleaned = clean_val(v)
    if not cleaned:
        return []
    parts = [p.strip() for p in cleaned.split(",")]
    return [p for p in parts if p and p != "null"]

for row in reader:
    vid = clean_val(row.get("video_id"))
    if not vid or not vid.startswith("V2026-"):
        continue
    
    title = clean_val(row.get("title")) or ""
    video_type = clean_val(row.get("video_type")) or "Highlight"
    original_cat = clean_val(row.get("original_category")) or "General"
    
    season_val = clean_val(row.get("season"))
    season = int(season_val) if season_val and season_val.isdigit() else 2026
    
    raw_teams = parse_list(row.get("teams"))
    normalized_teams = []
    for t in raw_teams:
        norm = TEAM_MAP.get(t.upper(), t.upper())
        if norm not in normalized_teams:
            normalized_teams.append(norm)
            
    players = parse_list(row.get("players"))
    opponent = clean_val(row.get("opponent"))
    if opponent:
        opponent = TEAM_MAP.get(opponent.upper(), opponent.upper())
        
    match_stage = clean_val(row.get("match_stage"))
    duration = clean_val(row.get("duration"))
    description = clean_val(row.get("description")) or title
    
    official_url = CANONICAL_DEEP_URLS.get(vid) or clean_val(row.get("official_video_url"))
    destination_url = official_url if official_url else OFFICIAL_HUB_URL
    is_exact_video_url = bool(official_url)
    
    beyond_cat = clean_val(row.get("beyond_xi_category")) or "General"
    suggested_dest = clean_val(row.get("suggested_destination")) or "Scores / Match Pulse"
    
    # Generate search keywords
    kw = set()
    for word in re.findall(r"\w+", title.lower()):
        if len(word) > 2:
            kw.add(word)
    for t in normalized_teams:
        kw.add(t.lower())
    for p in players:
        for word in re.findall(r"\w+", p.lower()):
            if len(word) > 2:
                kw.add(word)
    if match_stage:
        kw.add(match_stage.lower())
    if video_type:
        kw.add(video_type.lower())
    if opponent:
        kw.add(opponent.lower())
        
    item = {
        "id": vid,
        "title": title,
        "videoType": video_type,
        "originalCategory": original_cat,
        "season": season,
        "teams": normalized_teams,
        "players": players,
        "opponent": opponent,
        "matchStage": match_stage,
        "duration": duration,
        "description": description,
        "officialVideoUrl": official_url,
        "destinationUrl": destination_url,
        "isExactVideoUrl": is_exact_video_url,
        "broadcaster": "JioHotstar",
        "verified": True,
        "beyondXiCategory": beyond_cat,
        "suggestedDestination": suggested_dest,
        "keywords": sorted(list(kw))
    }
    items.append(item)

print(f"Successfully parsed {len(items)} video items.")

os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
with open(output_json_path, "w", encoding="utf-8") as out:
    json.dump(items, out, indent=2, ensure_ascii=False)

print(f"Saved to {output_json_path}")
