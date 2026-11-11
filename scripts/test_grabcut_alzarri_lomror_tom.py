import cv2
import numpy as np
from PIL import Image
import os

OUT_DIR = "scratch/test_cutouts"

# 3. Alzarri Joseph
print("Segmenting Alzarri Joseph...")
im_alz = cv2.imread("scratch/user_urls/alzarri.bin")
h, w = im_alz.shape[:2]
# Alzarri is centered. Bounding rect around player
# In 1280x720, let's locate the player bounding box
mask_alz = np.zeros((h, w), np.uint8)
bgdModel = np.zeros((1, 65), np.float64)
fgdModel = np.zeros((1, 65), np.float64)
# Player is in center roughly x: [350, 930], y: [20, 720]
rect_alz = (int(w * 0.28), int(h * 0.02), int(w * 0.44), int(h * 0.98))
cv2.grabCut(im_alz, mask_alz, rect_alz, bgdModel, fgdModel, 6, cv2.GC_INIT_WITH_RECT)
mask2_alz = np.where((mask_alz == 2) | (mask_alz == 0), 0, 1).astype('uint8') * 255

# Fill holes inside body
contours, _ = cv2.findContours(mask2_alz, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
clean_alz = np.zeros_like(mask2_alz)
if contours:
    c = max(contours, key=cv2.contourArea)
    cv2.drawContours(clean_alz, [c], -1, 255, thickness=cv2.FILLED)

clean_alz_blur = cv2.GaussianBlur(clean_alz, (3, 3), 0)
b, g, r = cv2.split(im_alz)
rgba_alz = cv2.merge([r, g, b, clean_alz_blur])
Image.fromarray(rgba_alz).save(f"{OUT_DIR}/alzarri_raw_cut.png")
print("Alzarri raw cut saved.")

# 4. Mahipal Lomror
print("Segmenting Mahipal Lomror...")
im_lom = cv2.imread("scratch/user_urls/lomror.bin")
h, w = im_lom.shape[:2]
# Lomror is on the left half of 1280x720, roughly x: [30, 520], y: [30, 720]
mask_lom = np.zeros((h, w), np.uint8)
bgdModel = np.zeros((1, 65), np.float64)
fgdModel = np.zeros((1, 65), np.float64)
rect_lom = (int(w * 0.02), int(h * 0.05), int(w * 0.40), int(h * 0.95))
cv2.grabCut(im_lom, mask_lom, rect_lom, bgdModel, fgdModel, 6, cv2.GC_INIT_WITH_RECT)
mask2_lom = np.where((mask_lom == 2) | (mask_lom == 0), 0, 1).astype('uint8') * 255

contours, _ = cv2.findContours(mask2_lom, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
clean_lom = np.zeros_like(mask2_lom)
if contours:
    c = max(contours, key=cv2.contourArea)
    cv2.drawContours(clean_lom, [c], -1, 255, thickness=cv2.FILLED)

clean_lom_blur = cv2.GaussianBlur(clean_lom, (3, 3), 0)
b, g, r = cv2.split(im_lom)
rgba_lom = cv2.merge([r, g, b, clean_lom_blur])
Image.fromarray(rgba_lom).save(f"{OUT_DIR}/lomror_raw_cut.png")
print("Lomror raw cut saved.")

# 5. Tom Curran
print("Segmenting Tom Curran...")
tc_path = r'C:/Users/KIIT0001/.gemini/antigravity/brain/edfbe3c6-07a5-4ea0-83a9-a565c340aefe/.user_uploaded/media_1791593849726_86bd2cfe.jpg'
im_tc = cv2.imread(tc_path)
h, w = im_tc.shape[:2]
mask_tc = np.zeros((h, w), np.uint8)
bgdModel = np.zeros((1, 65), np.float64)
fgdModel = np.zeros((1, 65), np.float64)
# Tom is in the center
rect_tc = (int(w * 0.12), int(h * 0.12), int(w * 0.76), int(h * 0.88))
cv2.grabCut(im_tc, mask_tc, rect_tc, bgdModel, fgdModel, 6, cv2.GC_INIT_WITH_RECT)
mask2_tc = np.where((mask_tc == 2) | (mask_tc == 0), 0, 1).astype('uint8') * 255

contours, _ = cv2.findContours(mask2_tc, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
clean_tc = np.zeros_like(mask2_tc)
if contours:
    c = max(contours, key=cv2.contourArea)
    cv2.drawContours(clean_tc, [c], -1, 255, thickness=cv2.FILLED)

clean_tc_blur = cv2.GaussianBlur(clean_tc, (3, 3), 0)
b, g, r = cv2.split(im_tc)
rgba_tc = cv2.merge([r, g, b, clean_tc_blur])
Image.fromarray(rgba_tc).save(f"{OUT_DIR}/tom_curran_raw_cut.png")
print("Tom Curran raw cut saved.")
