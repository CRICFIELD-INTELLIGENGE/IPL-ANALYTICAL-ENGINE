import os
from PIL import Image, ImageDraw

TARGET_W, TARGET_H = 360, 480
TOP_PAD = 20

def crop_and_fit(pil_im, target_w=TARGET_W, target_h=TARGET_H, top_pad=TOP_PAD):
    bbox = pil_im.getbbox()
    if not bbox:
        return pil_im
    cropped = pil_im.crop(bbox)
    sub_w, sub_h = cropped.size

    max_h = target_h - top_pad
    scale = max_h / sub_h
    new_w = int(sub_w * scale)
    new_h = int(sub_h * scale)

    if new_w > target_w:
        scale = target_w / sub_w
        new_w = int(sub_w * scale)
        new_h = int(sub_h * scale)

    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
    pos_x = (target_w - new_w) // 2
    pos_y = top_pad + (max_h - new_h) // 2
    canvas.paste(resized, (pos_x, pos_y), resized)
    return canvas

# Standardize refined
for name in ['alzarri_refined', 'lomror_refined', 'tom_curran_refined']:
    im = Image.open(f"scratch/test_cutouts/{name}.png").convert("RGBA")
    std = crop_and_fit(im)
    std.save(f"scratch/test_cutouts/{name}_std.png")
    print(f"Standardized {name}_std.png")

cards = [
    ("Virat Kohli (Benchmark)", r"Data-Insight-Engine/artifacts/ipl-analytics/public/players/rcb-2024/virat-kohli-rcb-2024.png"),
    ("Faf du Plessis", r"scratch/test_cutouts/faf-du-plessis.png"),
    ("Lockie Ferguson", r"scratch/test_cutouts/lockie-ferguson.png"),
    ("Alzarri Joseph", r"scratch/test_cutouts/alzarri_refined_std.png"),
    ("Mahipal Lomror", r"scratch/test_cutouts/lomror_refined_std.png"),
    ("Tom Curran", r"scratch/test_cutouts/tom_curran_refined_std.png")
]

card_w, card_h = 360, 480
total_w = card_w * len(cards) + 40 * (len(cards) + 1)
total_h = card_h + 120

strip = Image.new('RGBA', (total_w, total_h), (15, 23, 42, 255))
draw = ImageDraw.Draw(strip)

for idx, (title, path) in enumerate(cards):
    x = 40 + idx * (card_w + 40)
    y = 40
    draw.rectangle([x, y, x + card_w, y + card_h], fill=(30, 41, 59, 255), outline=(71, 85, 105, 255), width=2)
    if os.path.exists(path):
        p_im = Image.open(path).convert('RGBA')
        strip.paste(p_im, (x, y), p_im)
    else:
        print(f"NOT FOUND: {path}")
    draw.text((x + 10, y + card_h + 15), title, fill=(255, 255, 255, 255))

out_p = "scratch/test_cutouts/review_strip_refined.png"
strip.save(out_p)
print(f"Refined review strip saved to {out_p}")
