import urllib.request
from PIL import Image

url = "https://www.royalchallengers.com/PRRCB01/public/2026-03/2%20%2811%29.png"
dest = "./artifacts/ipl-analytics/public/players/rcb-2026/abhinandan-singh-rcb-2026.png"

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp, open(dest, 'wb') as f:
    f.write(resp.read())

im = Image.open(dest)
bb = im.getbbox()
min_x, min_y, max_x, max_y = bb
player_height = max_y - min_y
crop_top = max(0, min_y - 20)
crop_bottom = min(im.height, min_y + int(player_height * 0.46))
crop_left = max(0, min_x - 25)
crop_right = min(im.width, max_x + 25)
cropped = im.crop((crop_left, crop_top, crop_right, crop_bottom))
cropped.save(dest, optimize=True)
print(f"Abhinandan clean cropped: {cropped.size}")
