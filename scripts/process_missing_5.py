import os
import cv2
import numpy as np
from PIL import Image

OUT_DIR = "scratch/test_cutouts"
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

# 1. Lockie Ferguson (already transparent RGBA!)
print("1. Processing Lockie Ferguson...")
im_lockie = Image.open("scratch/user_urls/lockie.bin").convert("RGBA")
cut_lockie = crop_and_fit(im_lockie)
cut_lockie.save(f"{OUT_DIR}/lockie-ferguson.png")
print("  Lockie Ferguson done.")

# 2. Faf du Plessis (pure white background)
print("2. Processing Faf du Plessis...")
im_faf_cv = cv2.imread("scratch/user_urls/faf.bin")
h, w = im_faf_cv.shape[:2]
# White mask
white_mask = (im_faf_cv[:, :, 0] > 242) & (im_faf_cv[:, :, 1] > 242) & (im_faf_cv[:, :, 2] > 242)
fg_mask = (~white_mask).astype(np.uint8) * 255

# Fill holes in body/jersey
contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
clean_mask = np.zeros_like(fg_mask)
if contours:
    # Keep large contours (the person)
    c = max(contours, key=cv2.contourArea)
    cv2.drawContours(clean_mask, [c], -1, 255, thickness=cv2.FILLED)

# Feather mask edges slightly for smooth cut
clean_mask_blur = cv2.GaussianBlur(clean_mask, (3, 3), 0)

b, g, r = cv2.split(im_faf_cv)
rgba_faf = cv2.merge([r, g, b, clean_mask_blur])
pil_faf = Image.fromarray(rgba_faf)
cut_faf = crop_and_fit(pil_faf)
cut_faf.save(f"{OUT_DIR}/faf-du-plessis.png")
print("  Faf du Plessis done.")

print("Lockie and Faf successfully generated in scratch/test_cutouts!")
