import os
import cv2
import numpy as np
from PIL import Image

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

# Standardize Alzarri, Lomror, Tom Curran
for name in ['alzarri_raw_cut', 'lomror_raw_cut', 'tom_curran_raw_cut']:
    p = f"scratch/test_cutouts/{name}.png"
    im = Image.open(p).convert("RGBA")
    # For Alzarri and Lomror, they might be full torso. We want chest bust down to waist.
    std = crop_and_fit(im)
    slug = name.replace('_raw_cut', '')
    std.save(f"scratch/test_cutouts/{slug}_std.png")
    print(f"Standardized {slug} saved.")
