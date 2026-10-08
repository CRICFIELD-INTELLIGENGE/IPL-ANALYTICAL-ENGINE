import os
import glob
import shutil

repo = r"c:\Users\KIIT0001\Downloads\Data-Insight-Engine\Data-Insight-Engine"

print("--- Starting Cleanup ---")

# 1. Delete databases
db_paths = [
    os.path.join(repo, "sqlite.db"),
    os.path.join(repo, "scripts", "sqlite.db")
]
for p in db_paths:
    if os.path.exists(p):
        try:
            os.remove(p)
            print(f"Deleted database: {p}")
        except Exception as e:
            print(f"Error deleting database {p}: {e}")

# 2. Delete raw Cricsheet JSON files
raw_dir = os.path.join(repo, "lib", "cricket-data", "raw")
if os.path.exists(raw_dir):
    json_files = glob.glob(os.path.join(raw_dir, "*.json"))
    print(f"Found {len(json_files)} raw Cricsheet JSON files in {raw_dir}. Deleting...")
    for f in json_files:
        try:
            os.remove(f)
        except Exception as e:
            print(f"Error deleting file {f}: {e}")
    print("Deleted all raw JSON files.")

# 3. Delete raw ipl directory
ipl_dir = os.path.join(raw_dir, "ipl")
if os.path.exists(ipl_dir):
    try:
        shutil.rmtree(ipl_dir)
        print(f"Deleted raw IPL folder: {ipl_dir}")
    except Exception as e:
        print(f"Error deleting folder {ipl_dir}: {e}")

# 4. Delete aggregated JSON files
agg_dir = os.path.join(repo, "lib", "cricket-data", "aggregated")
if os.path.exists(agg_dir):
    agg_files = glob.glob(os.path.join(agg_dir, "*.json"))
    print(f"Found {len(agg_files)} aggregated files. Deleting...")
    for f in agg_files:
        try:
            os.remove(f)
        except Exception as e:
            print(f"Error deleting file {f}: {e}")

# 5. Delete public data files in frontend
public_dir = os.path.join(repo, "artifacts", "ipl-analytics", "public", "data")
if os.path.exists(public_dir):
    pub_files = glob.glob(os.path.join(public_dir, "*.json"))
    print(f"Found {len(pub_files)} public data files. Deleting...")
    for f in pub_files:
        try:
            os.remove(f)
        except Exception as e:
            print(f"Error deleting file {f}: {e}")

print("--- Cleanup Finished ---")
