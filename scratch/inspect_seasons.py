import pandas as pd
import os

path = r"C:\Users\KIIT0001\.cache\kagglehub\datasets\yusufmurtaza01\ipl-dataset-year-wise\versions\1"
csv_path = os.path.join(path, "ipl_data.csv")

try:
    df = pd.read_csv(csv_path)
    print("Seasons and match counts:")
    counts = df['year'].value_counts().sort_index()
    for yr, count in counts.items():
        print(f"Season {yr}: {count} matches")
    print("Total matches in dataset:", len(df))
except Exception as e:
    print("Error:", e)
