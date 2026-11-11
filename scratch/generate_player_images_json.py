import os
import json

pub_data_dir = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine\artifacts\ipl-analytics\public\data"
out_json_path = os.path.join(pub_data_dir, "player-images.json")

# Player image definitions from image players directory
# Images available:
# - ab devillers.jpg
# - abhisek sharma.jpg
# - bhuvaneswar kumar.jpg
# - bumrah.jpg
# - mayank yadav.jpg
# - msd.jpg
# - rohit sharma.jpg
# - sanju samson.jpg
# - suresh raina.jpg
# - virat kohli.jpg
# - virat-kohli.png

player_map = {
    # Virat Kohli
    "Virat Kohli": "/virat kohli.jpg",
    "V Kohli": "/virat kohli.jpg",
    "virat kohli": "/virat kohli.jpg",
    "virat-kohli": "/virat-kohli.png",
    
    # Jasprit Bumrah
    "Jasprit Bumrah": "/bumrah.jpg",
    "J Bumrah": "/bumrah.jpg",
    "bumrah": "/bumrah.jpg",
    "Jasprit Jasbirsingh Bumrah": "/bumrah.jpg",
    
    # MS Dhoni
    "MS Dhoni": "/msd.jpg",
    "M S Dhoni": "/msd.jpg",
    "MSD": "/msd.jpg",
    "msd": "/msd.jpg",
    "Mahendra Singh Dhoni": "/msd.jpg",
    "M Dhoni": "/msd.jpg",

    # Rohit Sharma
    "Rohit Sharma": "/rohit sharma.jpg",
    "RG Sharma": "/rohit sharma.jpg",
    "rohit sharma": "/rohit sharma.jpg",

    # AB de Villiers
    "AB de Villiers": "/ab devillers.jpg",
    "AB De Villiers": "/ab devillers.jpg",
    "AB devillers": "/ab devillers.jpg",
    "ab devillers": "/ab devillers.jpg",
    "ABD": "/ab devillers.jpg",
    "Abraham Benjamin de Villiers": "/ab devillers.jpg",

    # Suresh Raina
    "Suresh Raina": "/suresh raina.jpg",
    "S Raina": "/suresh raina.jpg",
    "suresh raina": "/suresh raina.jpg",
    "SK Raina": "/suresh raina.jpg",

    # Sanju Samson
    "Sanju Samson": "/sanju samson.jpg",
    "SV Samson": "/sanju samson.jpg",
    "sanju samson": "/sanju samson.jpg",

    # Abhishek Sharma
    "Abhishek Sharma": "/abhisek sharma.jpg",
    "Abhisek Sharma": "/abhisek sharma.jpg",
    "abhisek sharma": "/abhisek sharma.jpg",
    "A Sharma": "/abhisek sharma.jpg",

    # Bhuvneshwar Kumar / Bhuvaneshwar Kumar
    "Bhuvneshwar Kumar": "/bhuvaneswar kumar.jpg",
    "Bhuvaneshwar Kumar": "/bhuvaneswar kumar.jpg",
    "Bhuvaneswar Kumar": "/bhuvaneswar kumar.jpg",
    "bhuvaneswar kumar": "/bhuvaneswar kumar.jpg",
    "B Kumar": "/bhuvaneswar kumar.jpg",

    # Mayank Yadav
    "Mayank Yadav": "/mayank yadav.jpg",
    "mayank yadav": "/mayank yadav.jpg",
    "M Yadav": "/mayank yadav.jpg"
}

# Scan datasets to add variations if needed
print(f"Writing player-images.json with {len(player_map)} mappings to {out_json_path}...")
with open(out_json_path, "w", encoding="utf-8") as f:
    json.dump(player_map, f, indent=2)

print("Successfully created player-images.json!")
