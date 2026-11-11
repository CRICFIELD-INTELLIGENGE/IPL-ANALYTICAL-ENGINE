import urllib.request
import os

urls = {
    'faf': 'https://i.pinimg.com/736x/6d/0c/1e/6d0c1ea2cb1f7135d5ef69708324b151.jpg',
    'lockie': 'https://i.redd.it/he5ehwvi1irc1.png',
    'alzarri': 'https://crickettimes.com/wp-content/uploads/2025/12/Alzarri-Joseph.webp',
    'lomror': 'https://i.ytimg.com/vi/4l_0POiJpx0/maxresdefault.jpg'
}

os.makedirs('scratch/user_urls', exist_ok=True)
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for k, u in urls.items():
    dest = os.path.join('scratch', 'user_urls', f'{k}.bin')
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp, open(dest, 'wb') as f:
            f.write(resp.read())
        size = os.path.getsize(dest)
        print(f"[OK] {k}: {size} bytes")
    except Exception as e:
        print(f"[ERROR] {k}: {e}")
