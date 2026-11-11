from PIL import Image, ImageDraw, ImageFont
import os

cards = [
    ("Virat Kohli (Master)", r"artifacts/ipl-analytics/public/players/rcb-2024/virat-kohli-rcb-2024.png"),
    ("Faf du Plessis", r"scratch/test_cutouts/faf-du-plessis.png"),
    ("Lockie Ferguson", r"scratch/test_cutouts/lockie-ferguson.png"),
    ("Alzarri Joseph", r"scratch/test_cutouts/alzarri_std.png"),
    ("Mahipal Lomror", r"scratch/test_cutouts/lomror_std.png"),
    ("Tom Curran", r"scratch/test_cutouts/tom_curran_std.png")
]

card_w, card_h = 360, 480
total_w = card_w * len(cards) + 40 * (len(cards) + 1)
total_h = card_h + 120

strip = Image.new('RGBA', (total_w, total_h), (15, 23, 42, 255))
draw = ImageDraw.Draw(strip)

for idx, (title, path) in enumerate(cards):
    x = 40 + idx * (card_w + 40)
    y = 40
    # Draw card box
    draw.rectangle([x, y, x + card_w, y + card_h], fill=(30, 41, 59, 255), outline=(71, 85, 105, 255), width=2)
    # Paste player
    if os.path.exists(path):
        p_im = Image.open(path).convert('RGBA')
        strip.paste(p_im, (x, y), p_im)
    # Draw text
    draw.text((x + 10, y + card_h + 15), title, fill=(255, 255, 255, 255))

out_p = "scratch/test_cutouts/review_strip.png"
strip.save(out_p)
print(f"Review strip saved to {out_p}")
