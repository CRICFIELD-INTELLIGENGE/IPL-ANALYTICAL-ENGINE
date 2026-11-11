import os
import shutil
from PIL import Image
import numpy as np

PUBLIC_DIR = r'artifacts/ipl-analytics/public/players/rcb-2024'
DIST_DIR = r'artifacts/ipl-analytics/dist/public/players/rcb-2024'

os.makedirs(PUBLIC_DIR, exist_ok=True)
os.makedirs(DIST_DIR, exist_ok=True)

# List of 20 verified available raw images
available_players = [
    ('akash-deep', 'Akash Deep'),
    ('anuj-rawat', 'Anuj Rawat'),
    ('cameron-green', 'Cameron Green'),
    ('dinesh-karthik', 'Dinesh Karthik'),
    ('glenn-maxwell', 'Glenn Maxwell'),
    ('himanshu-sharma', 'Himanshu Sharma'),
    ('karn-sharma', 'Karn Sharma'),
    ('manoj-bhandage', 'Manoj Bhandage'),
    ('mayank-dagar', 'Mayank Dagar'),
    ('mohammed-siraj', 'Mohammed Siraj'),
    ('rajan-kumar', 'Rajan Kumar'),
    ('rajat-patidar', 'Rajat Patidar'),
    ('reece-topley', 'Reece Topley'),
    ('saurav-chauhan', 'Saurav Chauhan'),
    ('suyash-prabhudessai', 'Suyash Prabhudessai'),
    ('swapnil-singh', 'Swapnil Singh'),
    ('vijaykumar-vyshak', 'Vijaykumar Vyshak'),
    ('virat-kohli', 'Virat Kohli'),
    ('will-jacks', 'Will Jacks'),
    ('yash-dayal', 'Yash Dayal')
]

TARGET_W, TARGET_H = 360, 480
TOP_PAD = 20

print(f'Standardizing {len(available_players)} players to {TARGET_W}x{TARGET_H} RGBA...')

for slug, name in available_players:
    raw_path = os.path.join(PUBLIC_DIR, f'{slug}-rcb-2024-raw.png')
    if not os.path.exists(raw_path):
        print(f'Warning: {raw_path} not found!')
        continue

    im = Image.open(raw_path).convert('RGBA')
    arr = np.array(im)
    alpha = arr[:, :, 3]

    rows = np.where(alpha > 15)[0]
    cols = np.where(alpha > 15)[1]

    if len(rows) == 0 or len(cols) == 0:
        print(f'Warning: empty image for {name}')
        continue

    y_min, y_max = rows.min(), rows.max()
    x_min, x_max = cols.min(), cols.max()

    subject = im.crop((x_min, y_min, x_max + 1, y_max + 1))
    sub_w, sub_h = subject.size

    # Fit into 360x480 canvas with top padding
    max_h = TARGET_H - TOP_PAD
    scale = max_h / sub_h
    new_w = int(sub_w * scale)
    new_h = int(sub_h * scale)

    # If width exceeds target, scale to width
    if new_w > TARGET_W:
        scale = TARGET_W / sub_w
        new_w = int(sub_w * scale)
        new_h = int(sub_h * scale)

    resized_sub = subject.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new('RGBA', (TARGET_W, TARGET_H), (0, 0, 0, 0))
    pos_x = (TARGET_W - new_w) // 2
    pos_y = TOP_PAD + (max_h - new_h) // 2

    canvas.paste(resized_sub, (pos_x, pos_y), resized_sub)

    out_pub = os.path.join(PUBLIC_DIR, f'{slug}-rcb-2024.png')
    out_dist = os.path.join(DIST_DIR, f'{slug}-rcb-2024.png')

    canvas.save(out_pub, optimize=True)
    canvas.save(out_dist, optimize=True)

    # Also copy raw to dist
    dist_raw = os.path.join(DIST_DIR, f'{slug}-rcb-2024-raw.png')
    shutil.copyfile(raw_path, dist_raw)

    print(f'  [OK] {name}: ({sub_w}x{sub_h}) -> {new_w}x{new_h} centered at ({pos_x}, {pos_y})')

print('All 20 available player portraits successfully standardized and deployed!')
