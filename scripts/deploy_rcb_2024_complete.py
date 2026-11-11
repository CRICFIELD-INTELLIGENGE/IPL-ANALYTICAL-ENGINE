import os
import shutil
import json
from PIL import Image, ImageFilter
import numpy as np

PUBLIC_DIR = r"Data-Insight-Engine/artifacts/ipl-analytics/public/players/rcb-2024"
DIST_DIR = r"Data-Insight-Engine/artifacts/ipl-analytics/dist/public/players/rcb-2024"
os.makedirs(PUBLIC_DIR, exist_ok=True)
os.makedirs(DIST_DIR, exist_ok=True)

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

# 1. Finalize Tom Curran
im_tc = Image.open('scratch/test_cutouts/tom_curran_cleaned_final2.png').convert('RGBA')
arr_tc = np.array(im_tc)
arr_tc[220:290, 60:125, 3] = 0
tc_clean = Image.fromarray(arr_tc)
tc_final = crop_and_fit(tc_clean)

# 2. Finalize Alzarri Joseph
im_a = Image.open('scratch/test_cutouts/alzarri_raw_cut.png').convert('RGBA')
arr_a = np.array(im_a)
arr_a[:, :418, 3] = 0
arr_a[:, 875:, 3] = 0
alz_final = crop_and_fit(Image.fromarray(arr_a))

# 3. Finalize Mahipal Lomror
im_l = Image.open('scratch/test_cutouts/lomror_raw_cut.png').convert('RGBA')
lom_final = crop_and_fit(im_l)

# 4. Finalize Lockie Ferguson
im_lockie = Image.open('scratch/user_urls/lockie.bin').convert('RGBA')
lockie_final = crop_and_fit(im_lockie)

# 5. Finalize Faf du Plessis
im_faf = Image.open('scratch/test_cutouts/faf-du-plessis.png').convert('RGBA')
faf_final = crop_and_fit(im_faf)

# 6. Finalize Real Virat Kohli (#2)
im_vk = Image.open('scratch/kohli_2.png').convert('RGBA')
vk_final = crop_and_fit(im_vk)

deploy_map = {
    'virat-kohli': vk_final,
    'faf-du-plessis': faf_final,
    'lockie-ferguson': lockie_final,
    'alzarri-joseph': alz_final,
    'mahipal-lomror': lom_final,
    'tom-curran': tc_final
}

print("Saving standardized images to public and dist...")
for slug, im in deploy_map.items():
    pub_path = os.path.join(PUBLIC_DIR, f"{slug}-rcb-2024.png")
    dist_path = os.path.join(DIST_DIR, f"{slug}-rcb-2024.png")
    im.save(pub_path, optimize=True)
    im.save(dist_path, optimize=True)
    print(f"  [DEPLOYED] {slug}-rcb-2024.png")

print("All 6 portraits deployed successfully!")
