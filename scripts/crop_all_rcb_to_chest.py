from PIL import Image
import os, glob

files = glob.glob('./artifacts/ipl-analytics/public/players/rcb-2026/*.png')
print(f'Starting chest-up crop for {len(files)} player portraits...')

for f in files:
    im = Image.open(f)
    bb = im.getbbox()
    if not bb:
        print(f'[Skip empty] {f}')
        continue
    
    # Player bounding box in master coordinates
    min_x, min_y, max_x, max_y = bb
    player_height = max_y - min_y
    player_width = max_x - min_x
    
    # Top of head with a comfortable breathing margin
    crop_top = max(0, min_y - 20)
    
    # Exact chest / mid-torso bottom cut (46% of total body height)
    crop_bottom = min(im.height, min_y + int(player_height * 0.46))
    
    # Horizontal framing: tightly hug shoulders with 25px margin
    crop_left = max(0, min_x - 25)
    crop_right = min(im.width, max_x + 25)
    
    crop_box = (crop_left, crop_top, crop_right, crop_bottom)
    cropped = im.crop(crop_box)
    
    # Save back with high quality PNG
    cropped.save(f, optimize=True)
    w, h = cropped.size
    print(f'[OK] {os.path.basename(f)}: cropped to {w}x{h} (aspect: {w/h:.2f})')

print('All 25 portraits cropped to exact chest size!')
