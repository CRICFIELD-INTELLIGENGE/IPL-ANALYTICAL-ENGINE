import pandas as pd
import os

path = r"C:\Users\KIIT0001\.cache\kagglehub\datasets\yusufmurtaza01\ipl-dataset-year-wise\versions\1"
csv_path = os.path.join(path, "ipl_data.csv")

try:
    df = pd.read_csv(csv_path)
    print("Shape:", df.shape)
    print("Columns:")
    for col in df.columns:
        print(f" - {col}")
    print("\nFirst 3 rows:")
    print(df.head(3).to_string())
except Exception as e:
    print("Error:", e)
