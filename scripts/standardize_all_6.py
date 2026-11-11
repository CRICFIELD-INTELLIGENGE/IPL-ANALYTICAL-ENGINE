from PIL import Image, ImageDraw
import numpy as np
import os

OUT_DIR = "scratch/test_cutouts"
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

# Standardize each
players = [
    ("virat-kohli", Image.open("scratch/kohli_2.png").convert("RGBA")),
    ("faf-du-plessis", Image.open(f"{OUT_DIR}/faf-du-plessis.png").convert("RGBA")),
    ("lockie-ferguson", Image.open("scratch/user_urls/lockie.bin").convert("RGBA")),
    ("alzarri-joseph", Image.open(f"{OUT_DIR}/alzarri_clean.png").convert("RGBA")),
    ("mahipal-lomror", Image.open(f"{OUT_DIR}/lomror_raw_cut.png").convert("RGBA")),
    ("tom-curran", Image.open(f"{OUT_DIR}/tom_curran_clean.png").convert("RGBA"))
]

std_players = []
for slug, im in players:
    std = crop_and_fit(im)
    p_path = f"{OUT_DIR}/{slug}_final.png"
    std.save(p_path)
    std_players.append((slug, p_path))
    print(f"Standardized {slug} -> {p_path}")

# Build review strip
card_w, card_h = 360, 480
total_w = card_w * len(std_players) + 40 * (len(std_players) + 1)
total_h = card_h + 120

strip = Image.new('RGBA', (total_w, total_h), (15, 23, 42, 255))
draw = ImageDraw.Draw(strip)

for idx, (slug, path) in enumerate(std_players):
    x = 40 + idx * (card_w + 40)
    y = 40
    draw.rectangle([x, y, x + card_w, y + card_h], fill=(30, 41, 59, 255), outline=(71, 85, 105, 255), width=2)
    p_im = Image.open(path).convert('RGBA')
    strip.paste(p_im, (x, y), p_im)
    draw.text((x + 10, y + card_h + 15), slug, fill=(255, 255, 255, 255))

strip_path = f"{OUT_DIR}/strip_verified.png"
strip.save(strip_path)
print(f"Saved {strip_path}")
