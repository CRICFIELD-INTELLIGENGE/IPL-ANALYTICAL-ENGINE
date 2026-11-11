import cv2
import numpy as np
from PIL import Image, ImageDraw
import os

OUT_DIR = "scratch/perfect_cutouts"
os.makedirs(OUT_DIR, exist_ok=True)

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

# 1. Virat Kohli (Real 2.png)
print("1. Processing Real Virat Kohli...")
im_vk = Image.open("scratch/kohli_2.png").convert("RGBA")
vk_std = crop_and_fit(im_vk)
vk_std.save(f"{OUT_DIR}/virat-kohli.png")

# 2. Lockie Ferguson
print("2. Processing Lockie Ferguson...")
im_lockie = Image.open("scratch/user_urls/lockie.bin").convert("RGBA")
lockie_std = crop_and_fit(im_lockie)
lockie_std.save(f"{OUT_DIR}/lockie-ferguson.png")

# 3. Faf du Plessis
print("3. Processing Faf du Plessis...")
im_faf_cv = cv2.imread("scratch/user_urls/faf.bin")
h, w = im_faf_cv.shape[:2]
white_mask = (im_faf_cv[:, :, 0] > 240) & (im_faf_cv[:, :, 1] > 240) & (im_faf_cv[:, :, 2] > 240)
fg_mask_faf = (~white_mask).astype(np.uint8) * 255
contours, _ = cv2.findContours(fg_mask_faf, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
clean_faf = np.zeros_like(fg_mask_faf)
if contours:
    c = max(contours, key=cv2.contourArea)
    cv2.drawContours(clean_faf, [c], -1, 255, thickness=cv2.FILLED)
clean_faf_blur = cv2.GaussianBlur(clean_faf, (3, 3), 0)
b, g, r = cv2.split(im_faf_cv)
rgba_faf = cv2.merge([r, g, b, clean_faf_blur])
faf_std = crop_and_fit(Image.fromarray(rgba_faf))
faf_std.save(f"{OUT_DIR}/faf-du-plessis.png")

# 4. Alzarri Joseph
print("4. Processing Alzarri Joseph...")
im_alz = cv2.imread("scratch/user_urls/alzarri.bin")
h, w = im_alz.shape[:2]
# Red background detector
red_alz = (im_alz[:, :, 2] > 140) & ((im_alz[:, :, 2].astype(int) - im_alz[:, :, 1].astype(int)) > 45) & ((im_alz[:, :, 2].astype(int) - im_alz[:, :, 0].astype(int)) > 45)
# Also top corners vignette
fg_alz = (~red_alz).astype(np.uint8) * 255
# Mask borders
fg_alz[:, :350] = 0
fg_alz[:, 920:] = 0
fg_alz[:20, :] = 0

contours, _ = cv2.findContours(fg_alz, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
clean_alz = np.zeros_like(fg_alz)
if contours:
    c = max(contours, key=cv2.contourArea)
    cv2.drawContours(clean_alz, [c], -1, 255, thickness=cv2.FILLED)

# Morphological smoothing to clean edges
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
clean_alz = cv2.morphologyEx(clean_alz, cv2.MORPH_CLOSE, kernel)
clean_alz_blur = cv2.GaussianBlur(clean_alz, (3, 3), 0)
b, g, r = cv2.split(im_alz)
rgba_alz = cv2.merge([r, g, b, clean_alz_blur])
alz_std = crop_and_fit(Image.fromarray(rgba_alz))
alz_std.save(f"{OUT_DIR}/alzarri-joseph.png")

# 5. Mahipal Lomror
print("5. Processing Mahipal Lomror...")
im_lom = cv2.imread("scratch/user_urls/lomror.bin")
h, w = im_lom.shape[:2]
red_lom = (im_lom[:, :, 2] > 70) & ((im_lom[:, :, 2].astype(int) - im_lom[:, :, 0].astype(int)) > 40) & ((im_lom[:, :, 2].astype(int) - im_lom[:, :, 1].astype(int)) > 40)
fg_lom = (~red_lom).astype(np.uint8) * 255
# Restrict to left half where Lomror stands
fg_lom[:, 520:] = 0
fg_lom[:, :25] = 0
fg_lom[:25, :] = 0

contours, _ = cv2.findContours(fg_lom, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
clean_lom = np.zeros_like(fg_lom)
if contours:
    c = max(contours, key=cv2.contourArea)
    cv2.drawContours(clean_lom, [c], -1, 255, thickness=cv2.FILLED)

kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
clean_lom = cv2.morphologyEx(clean_lom, cv2.MORPH_CLOSE, kernel)
clean_lom_blur = cv2.GaussianBlur(clean_lom, (3, 3), 0)
b, g, r = cv2.split(im_lom)
rgba_lom = cv2.merge([r, g, b, clean_lom_blur])
lom_std = crop_and_fit(Image.fromarray(rgba_lom))
lom_std.save(f"{OUT_DIR}/mahipal-lomror.png")

# 6. Tom Curran
print("6. Processing Tom Curran...")
tc_path = r'C:/Users/KIIT0001/.gemini/antigravity/brain/edfbe3c6-07a5-4ea0-83a9-a565c340aefe/.user_uploaded/media_1791593849726_86bd2cfe.jpg'
im_tc = cv2.imread(tc_path)
h, w = im_tc.shape[:2]

# Banner red detector
banner_red = (im_tc[:, :, 2] > 105) & (im_tc[:, :, 1] < 75) & (im_tc[:, :, 0] < 85)
# Dark right banner
dark_banner = (im_tc[:, :, 2] < 120) & (im_tc[:, :, 1] < 70) & (im_tc[:, :, 0] < 70) & (np.arange(w) > 280)

fg_tc = (~banner_red).astype(np.uint8) * 255
fg_tc[dark_banner] = 0
fg_tc[:50, :] = 0
fg_tc[:, :25] = 0
fg_tc[:, 375:] = 0

contours, _ = cv2.findContours(fg_tc, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
clean_tc = np.zeros_like(fg_tc)
if contours:
    c = max(contours, key=cv2.contourArea)
    cv2.drawContours(clean_tc, [c], -1, 255, thickness=cv2.FILLED)

kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
clean_tc = cv2.morphologyEx(clean_tc, cv2.MORPH_CLOSE, kernel)
clean_tc_blur = cv2.GaussianBlur(clean_tc, (3, 3), 0)
b, g, r = cv2.split(im_tc)
rgba_tc = cv2.merge([r, g, b, clean_tc_blur])
tc_std = crop_and_fit(Image.fromarray(rgba_tc))
tc_std.save(f"{OUT_DIR}/tom-curran.png")

# Generate preview strip of all 6
cards = [
    ("Virat Kohli (Real #2)", f"{OUT_DIR}/virat-kohli.png"),
    ("Faf du Plessis", f"{OUT_DIR}/faf-du-plessis.png"),
    ("Lockie Ferguson", f"{OUT_DIR}/lockie-ferguson.png"),
    ("Alzarri Joseph", f"{OUT_DIR}/alzarri-joseph.png"),
    ("Mahipal Lomror", f"{OUT_DIR}/mahipal-lomror.png"),
    ("Tom Curran", f"{OUT_DIR}/tom-curran.png")
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
    p_im = Image.open(path).convert('RGBA')
    strip.paste(p_im, (x, y), p_im)
    draw.text((x + 10, y + card_h + 15), title, fill=(255, 255, 255, 255))

strip_path = f"{OUT_DIR}/final_review_strip.png"
strip.save(strip_path)
print(f"Final review strip saved to {strip_path}")
