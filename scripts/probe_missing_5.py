import urllib.request
import urllib.error

headers = {'User-Agent': 'Mozilla/5.0'}

candidates = [
    # Faf du Plessis
    'https://www.royalchallengers.com/PRRCB01/public/2024-03/faf.png',
    'https://www.royalchallengers.com/PRRCB01/public/2024-03/faf_0.png',
    'https://www.royalchallengers.com/PRRCB01/public/2024-04/faf.png',
    'https://www.royalchallengers.com/PRRCB01/public/2025-03/faf.png',
    'https://www.royalchallengers.com/PRRCB01/public/2026-03/faf.png',
    'https://www.royalchallengers.com/PRRCB01/public/2024-03/Faf%20Du%20Plessis.png',
    'https://www.royalchallengers.com/PRRCB01/public/2024-03/Faf.png',
    # Mahipal Lomror
    'https://www.royalchallengers.com/PRRCB01/public/2024-03/lomror.png',
    'https://www.royalchallengers.com/PRRCB01/public/2024-03/mahipal.png',
    'https://www.royalchallengers.com/PRRCB01/public/2025-03/lomror.png',
    # Lockie Ferguson
    'https://www.royalchallengers.com/PRRCB01/public/2024-03/ferguson.png',
    'https://www.royalchallengers.com/PRRCB01/public/2024-03/lockie.png',
    # Alzarri Joseph
    'https://www.royalchallengers.com/PRRCB01/public/2024-03/alzarri.png',
    'https://www.royalchallengers.com/PRRCB01/public/2024-03/joseph.png',
    # Tom Curran
    'https://www.royalchallengers.com/PRRCB01/public/2024-03/curran.png',
    'https://www.royalchallengers.com/PRRCB01/public/2024-03/tom.png'
]

# Also probe BCCI IPLHeadshot2024 with common player IDs for Faf, Ferguson, Joseph, Lomror, Curran
for pid in [18, 24, 94, 182, 194, 218, 282, 384, 526, 857, 1024, 1125, 1461, 1759, 2183, 2876, 3098, 3511, 3729, 3746, 3840, 4490, 5430, 5471, 6539, 6555, 6573, 6683, 6871, 6946, 7060, 7405, 7565, 7873, 8052]:
    candidates.append(f'https://documents.iplt20.com/ipl/IPLHeadshot2024/{pid}.png')

print(f'Probing {len(candidates)} URLs...')
found = []
for url in candidates:
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            sz = int(resp.headers.get('Content-Length', 0))
            if sz > 20000:
                print(f'FOUND: {resp.status} ({sz} bytes) -> {url}')
                found.append((url, sz))
    except Exception:
        pass

print(f'Found {len(found)} valid assets.')
