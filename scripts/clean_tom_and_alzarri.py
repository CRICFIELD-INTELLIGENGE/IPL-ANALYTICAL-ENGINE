import cv2
import numpy as np
from PIL import Image

# 1. Clean Alzarri Joseph
alz_im = Image.open("scratch/test_cutouts/alzarri_raw_cut.png").convert("RGBA")
arr_a = np.array(alz_im)
# Remove the tiny red slivers on the far left and right behind arms
# The red sliver is near the bottom edges (y > 450, x < 450 or x > 840) where color is red: R > 150, G < 50, B < 50
red_sliver = (arr_a[:, :, 0] > 140) & (arr_a[:, :, 1] < 60) & (arr_a[:, :, 2] < 60)
# Also remove the tiny white text fragment "are" at x < 450, y in [400, 500]
white_text = (arr_a[:, :, 0] > 180) & (arr_a[:, :, 1] > 180) & (arr_a[:, :, 2] > 180) & (np.arange(arr_a.shape[1]) < 440)

arr_a[red_sliver, 3] = 0
arr_a[white_text, 3] = 0
clean_alz = Image.fromarray(arr_a)
clean_alz.save("scratch/test_cutouts/alzarri_clean.png")
print("Cleaned Alzarri saved.")

# 2. Clean Tom Curran
tc_im = Image.open("scratch/test_cutouts/tom_curran_raw_cut.png").convert("RGBA")
arr_tc = np.array(tc_im)
# In Tom Curran, remove the gold crown / red banner above his right arm: x in [50, 125], y in [150, 215]
# Color of crown/banner is gold/red (R > 140, B < 100)
crown_banner = (np.arange(arr_tc.shape[1]) < 130) & (np.arange(arr_tc.shape[0])[:, None] > 140) & (np.arange(arr_tc.shape[0])[:, None] < 225) & (arr_tc[:, :, 2] < 110)
arr_tc[crown_banner, 3] = 0

# Also behind his head on the left: y < 140, x < 130
top_left_banner = (np.arange(arr_tc.shape[1]) < 130) & (np.arange(arr_tc.shape[0])[:, None] < 150)
arr_tc[top_left_banner, 3] = 0

# Also top right of head: y < 140, x > 260
top_right_banner = (np.arange(arr_tc.shape[1]) > 260) & (np.arange(arr_tc.shape[0])[:, None] < 150)
arr_tc[top_right_banner, 3] = 0

clean_tc = Image.fromarray(arr_tc)
clean_tc.save("scratch/test_cutouts/tom_curran_clean.png")
print("Cleaned Tom Curran saved.")
