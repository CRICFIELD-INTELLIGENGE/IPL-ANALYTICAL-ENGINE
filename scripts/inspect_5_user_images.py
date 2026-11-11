import os
from PIL import Image
import numpy as np

images = {
    'faf-du-plessis': r'C:/Users/KIIT0001/.gemini/antigravity/brain/edfbe3c6-07a5-4ea0-83a9-a565c340aefe/.user_uploaded/media_1791593257629_dc3ce11d.jpg',
    'lockie-ferguson': r'C:/Users/KIIT0001/.gemini/antigravity/brain/edfbe3c6-07a5-4ea0-83a9-a565c340aefe/.user_uploaded/media_1791593282918_37efad4c.jpg',
    'alzarri-joseph': r'C:/Users/KIIT0001/.gemini/antigravity/brain/edfbe3c6-07a5-4ea0-83a9-a565c340aefe/.user_uploaded/media_1791593473884_2a7cb602.jpg',
    'mahipal-lomror': r'C:/Users/KIIT0001/.gemini/antigravity/brain/edfbe3c6-07a5-4ea0-83a9-a565c340aefe/.user_uploaded/media_1791593660583_f3816645.jpg',
    'tom-curran': r'C:/Users/KIIT0001/.gemini/antigravity/brain/edfbe3c6-07a5-4ea0-83a9-a565c340aefe/.user_uploaded/media_1791593849726_86bd2cfe.jpg'
}

for name, path in images.items():
    if not os.path.exists(path):
        print(f"{name}: File NOT FOUND at {path}")
        continue
    im = Image.open(path)
    arr = np.array(im)
    h, w = arr.shape[:2]
    top_left = arr[0, 0]
    top_right = arr[0, -1]
    bottom_left = arr[-1, 0]
    bottom_right = arr[-1, -1]
    print(f"{name}: size={w}x{h}, mode={im.mode}")
    print(f"  TL: {top_left}, TR: {top_right}, BL: {bottom_left}, BR: {bottom_right}")
