import cv2
import numpy as np
from PIL import Image

OUT_DIR = "scratch/test_cutouts"

# 1. Refine Tom Curran
print("Refining Tom Curran with GC_INIT_WITH_MASK...")
tc_path = r'C:/Users/KIIT0001/.gemini/antigravity/brain/edfbe3c6-07a5-4ea0-83a9-a565c340aefe/.user_uploaded/media_1791593849726_86bd2cfe.jpg'
im_tc = cv2.imread(tc_path)
h, w = im_tc.shape[:2]

mask = np.full((h, w), cv2.GC_PR_BGD, dtype=np.uint8)

# Probable foreground: roughly where Tom Curran is
# Head, torso, arms: x in [35, 360], y in [55, 450]
mask[55:450, 35:360] = cv2.GC_PR_FGD

# Sure background:
# Top corners
mask[0:60, :] = cv2.GC_BGD
mask[:, 0:25] = cv2.GC_BGD
mask[:, 370:w] = cv2.GC_BGD
# Far left top banner (behind left arm)
mask[0:160, 0:105] = cv2.GC_BGD
# Far right top banner (behind right arm)
mask[0:160, 265:w] = cv2.GC_BGD

# Sure foreground:
# Head
mask[80:160, 160:220] = cv2.GC_FGD
# Jersey center
mask[200:340, 140:240] = cv2.GC_FGD
# Raised hands on collar
mask[160:220, 130:160] = cv2.GC_FGD
mask[160:220, 220:250] = cv2.GC_FGD

bgdModel = np.zeros((1, 65), np.float64)
fgdModel = np.zeros((1, 65), np.float64)
cv2.grabCut(im_tc, mask, None, bgdModel, fgdModel, 8, cv2.GC_INIT_WITH_MASK)

fg_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

# Clean mask with morphology
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)

# Keep only the largest contour
contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
clean_tc = np.zeros_like(fg_mask)
if contours:
    c = max(contours, key=cv2.contourArea)
    cv2.drawContours(clean_tc, [c], -1, 255, thickness=cv2.FILLED)

clean_tc_blur = cv2.GaussianBlur(clean_tc, (3, 3), 0)
b, g, r = cv2.split(im_tc)
rgba_tc = cv2.merge([r, g, b, clean_tc_blur])
Image.fromarray(rgba_tc).save(f"{OUT_DIR}/tom_curran_refined.png")
print("Tom Curran refined cutout saved.")

# 2. Refine Alzarri Joseph (clean left arm edge)
print("Refining Alzarri Joseph...")
im_alz = cv2.imread("scratch/user_urls/alzarri.bin")
h, w = im_alz.shape[:2]
mask_a = np.full((h, w), cv2.GC_PR_BGD, dtype=np.uint8)
# Alzarri center x in [380, 900], y in [20, 720]
mask_a[20:720, 390:890] = cv2.GC_PR_FGD
# Sure background: borders
mask_a[:, 0:380] = cv2.GC_BGD
mask_a[:, 900:w] = cv2.GC_BGD
mask_a[0:25, :] = cv2.GC_BGD
# Sure foreground: head and jersey
mask_a[60:220, 520:720] = cv2.GC_FGD
mask_a[260:550, 480:780] = cv2.GC_FGD

bgdModel = np.zeros((1, 65), np.float64)
fgdModel = np.zeros((1, 65), np.float64)
cv2.grabCut(im_alz, mask_a, None, bgdModel, fgdModel, 8, cv2.GC_INIT_WITH_MASK)
fg_mask_a = np.where((mask_a == cv2.GC_FGD) | (mask_a == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

contours, _ = cv2.findContours(fg_mask_a, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
clean_a = np.zeros_like(fg_mask_a)
if contours:
    c = max(contours, key=cv2.contourArea)
    cv2.drawContours(clean_a, [c], -1, 255, thickness=cv2.FILLED)

clean_a_blur = cv2.GaussianBlur(clean_a, (3, 3), 0)
b, g, r = cv2.split(im_alz)
rgba_alz = cv2.merge([r, g, b, clean_a_blur])
Image.fromarray(rgba_alz).save(f"{OUT_DIR}/alzarri_refined.png")
print("Alzarri refined cutout saved.")

# 3. Refine Mahipal Lomror
print("Refining Mahipal Lomror...")
im_lom = cv2.imread("scratch/user_urls/lomror.bin")
h, w = im_lom.shape[:2]
mask_l = np.full((h, w), cv2.GC_PR_BGD, dtype=np.uint8)
# Lomror is in left half: x in [30, 520], y in [40, 720]
mask_l[40:720, 40:510] = cv2.GC_PR_FGD
# Background: right half with text
mask_l[:, 520:w] = cv2.GC_BGD
mask_l[0:40, :] = cv2.GC_BGD
mask_l[:, 0:30] = cv2.GC_BGD
# Foreground: head and jersey
mask_l[80:250, 200:360] = cv2.GC_FGD
mask_l[280:550, 150:420] = cv2.GC_FGD

bgdModel = np.zeros((1, 65), np.float64)
fgdModel = np.zeros((1, 65), np.float64)
cv2.grabCut(im_lom, mask_l, None, bgdModel, fgdModel, 8, cv2.GC_INIT_WITH_MASK)
fg_mask_l = np.where((mask_l == cv2.GC_FGD) | (mask_l == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

contours, _ = cv2.findContours(fg_mask_l, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
clean_l = np.zeros_like(fg_mask_l)
if contours:
    c = max(contours, key=cv2.contourArea)
    cv2.drawContours(clean_l, [c], -1, 255, thickness=cv2.FILLED)

clean_l_blur = cv2.GaussianBlur(clean_l, (3, 3), 0)
b, g, r = cv2.split(im_lom)
rgba_lom = cv2.merge([r, g, b, clean_l_blur])
Image.fromarray(rgba_lom).save(f"{OUT_DIR}/lomror_refined.png")
print("Mahipal Lomror refined cutout saved.")
