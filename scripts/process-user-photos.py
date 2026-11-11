import os
import cv2
import numpy as np
from PIL import Image, ImageFilter

user_dir = r"C:\Users\KIIT0001\.gemini\antigravity\brain\edfbe3c6-07a5-4ea0-83a9-a565c340aefe\.user_uploaded"
out_dir_2025 = r"artifacts\ipl-analytics\public\players\rcb-2025"
out_dir_2026 = r"artifacts\ipl-analytics\public\players\rcb-2026"
os.makedirs(out_dir_2025, exist_ok=True)
os.makedirs(out_dir_2026, exist_ok=True)

def remove_white_bg(img_path, tol=25):
    """Cleanly remove white background and feather alpha edges."""
    im = cv2.imread(img_path)
    if im is None:
        raise ValueError(f"Could not load {img_path}")
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    # White is low saturation, high value
    lower_white = np.array([0, 0, 255 - tol])
    upper_white = np.array([180, tol, 255])
    mask = cv2.inRange(hsv, lower_white, upper_white)
    
    # Also check RGB near 255
    rgb_white = (im[:, :, 0] > 240) & (im[:, :, 1] > 240) & (im[:, :, 2] > 240)
    mask = mask | (rgb_white.astype(np.uint8) * 255)
    
    # Invert to get foreground
    fg_mask = cv2.bitwise_not(mask)
    
    # Clean up holes inside body/jersey
    contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    clean_mask = np.zeros_like(fg_mask)
    if contours:
        c = max(contours, key=cv2.contourArea)
        cv2.drawContours(clean_mask, [c], -1, 255, thickness=cv2.FILLED)
    
    # Convert BGR to RGBA
    b, g, r = cv2.split(im)
    alpha = clean_mask
    rgba = cv2.merge([r, g, b, alpha])
    pil_im = Image.fromarray(rgba)
    
    # Smooth edges slightly
    return pil_im

def remove_black_bg(img_path, tol=35):
    """Cleanly remove black background and feather alpha edges."""
    im = cv2.imread(img_path)
    if im is None:
        raise ValueError(f"Could not load {img_path}")
    
    # Check pixels near black
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, tol, 255, cv2.THRESH_BINARY)
    
    # Fill holes in body
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    clean_mask = np.zeros_like(mask)
    if contours:
        c = max(contours, key=cv2.contourArea)
        cv2.drawContours(clean_mask, [c], -1, 255, thickness=cv2.FILLED)
    
    b, g, r = cv2.split(im)
    rgba = cv2.merge([r, g, b, clean_mask])
    return Image.fromarray(rgba)

def remove_graphic_bg(img_path):
    """Use grabcut to isolate player from graphic background."""
    im = cv2.imread(img_path)
    if im is None:
        raise ValueError(f"Could not load {img_path}")
    h, w = im.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    bgdModel = np.zeros((1, 65), np.float64)
    fgdModel = np.zeros((1, 65), np.float64)
    # Player rect in center
    rect = (int(w * 0.1), int(h * 0.05), int(w * 0.8), int(h * 0.9))
    cv2.grabCut(im, mask, rect, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_RECT)
    mask2 = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8') * 255
    
    # Clean mask
    contours, _ = cv2.findContours(mask2, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    clean_mask = np.zeros_like(mask2)
    if contours:
        c = max(contours, key=cv2.contourArea)
        cv2.drawContours(clean_mask, [c], -1, 255, thickness=cv2.FILLED)
    
    b, g, r = cv2.split(im)
    rgba = cv2.merge([r, g, b, clean_mask])
    return Image.fromarray(rgba)

def crop_bust(pil_im, target_w=360, target_h=480):
    """Crop to chest bust and fit standard transparent card canvas."""
    # Find bounding box of non-transparent pixels
    bbox = pil_im.getbbox()
    if bbox:
        pil_im = pil_im.crop(bbox)
    
    # Scale to target height preserving aspect ratio
    w, h = pil_im.size
    scale = target_h / float(h)
    new_w = int(w * scale)
    new_h = target_h
    resized = pil_im.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Place on target_w x target_h transparent canvas aligned to bottom center
    canvas = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
    paste_x = (target_w - new_w) // 2
    canvas.paste(resized, (paste_x, 0), resized)
    return canvas

print("Starting cutout processing...")

# 1. Manoj Bhandage
manoj_source = 'manoj_bhandage_toi.jpg' if os.path.exists('manoj_bhandage_toi.jpg') else os.path.join(user_dir, 'media_1791584568945_d1ca0028.jpg')
mb_cutout = crop_bust(remove_white_bg(manoj_source))
mb_cutout.save(os.path.join(out_dir_2025, 'manoj-bhandage-rcb-2025.png'))
mb_cutout.save(os.path.join(out_dir_2026, 'manoj-bhandage-rcb-2026.png'))
print("Processed Manoj Bhandage -> manoj-bhandage-rcb-2025.png & 2026.png")

# 2. Mohit Rathee
mohit_source = 'mohit_rathee_toi.jpg' if os.path.exists('mohit_rathee_toi.jpg') else os.path.join(user_dir, 'media_1791584483810_23087b4c.jpg')
mr_cutout = crop_bust(remove_white_bg(mohit_source))
mr_cutout.save(os.path.join(out_dir_2025, 'mohit-rathee-rcb-2025.png'))
mr_cutout.save(os.path.join(out_dir_2026, 'mohit-rathee-rcb-2026.png'))
print("Processed Mohit Rathee -> mohit-rathee-rcb-2025.png & 2026.png")

# 3. Swastik Chikara
swastik_source = os.path.join(user_dir, 'media_1791584654591_db3c63a1.jpg')
sc_cutout = crop_bust(remove_black_bg(swastik_source))
sc_cutout.save(os.path.join(out_dir_2025, 'swastik-chikara-rcb-2025.png'))
sc_cutout.save(os.path.join(out_dir_2026, 'swastik-chikara-rcb-2026.png'))
print("Processed Swastik Chikara -> swastik-chikara-rcb-2025.png & 2026.png")

# 4. Mayank Agarwal
mayank_source = os.path.join(user_dir, 'media_1791584705917_a24de5f8.jpg')
ma_cutout = crop_bust(remove_graphic_bg(mayank_source))
ma_cutout.save(os.path.join(out_dir_2025, 'mayank-agarwal-rcb-2025.png'))
ma_cutout.save(os.path.join(out_dir_2026, 'mayank-agarwal-rcb-2026.png'))
print("Processed Mayank Agarwal -> mayank-agarwal-rcb-2025.png & 2026.png")

# 5. Lungi Ngidi
ngidi_source = os.path.join(user_dir, 'media_1791584724511_ded202df.jpg')
ln_cutout = crop_bust(remove_white_bg(ngidi_source))
ln_cutout.save(os.path.join(out_dir_2025, 'lungi-ngidi-rcb-2025.png'))
ln_cutout.save(os.path.join(out_dir_2026, 'lungi-ngidi-rcb-2026.png'))
print("Processed Lungi Ngidi -> lungi-ngidi-rcb-2025.png & 2026.png")

# 6. Rasikh Salam & Jacob Bethell
# Copy the official transparent RCB 2026 bust cutouts into 2025 so their shapes match all other squad members perfectly!
r26_p = os.path.join(out_dir_2026, 'rasikh-salam-rcb-2026.png')
b26_p = os.path.join(out_dir_2026, 'jacob-bethell-rcb-2026.png')

if os.path.exists(r26_p):
    r_im = crop_bust(Image.open(r26_p))
    r_im.save(os.path.join(out_dir_2025, 'rasikh-salam-rcb-2025.png'))
    print("Standardized Rasikh Salam 2025 bust shape.")

if os.path.exists(b26_p):
    b_im = crop_bust(Image.open(b26_p))
    b_im.save(os.path.join(out_dir_2025, 'jacob-bethell-rcb-2025.png'))
    print("Standardized Jacob Bethell 2025 bust shape.")

print("All cutouts successfully processed and saved!")
