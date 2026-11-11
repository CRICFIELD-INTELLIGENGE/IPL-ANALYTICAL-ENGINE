"""Turns squad portraits shot on a flat studio backdrop into transparent cut-outs,
so they sit on the squad card like the other (already transparent) portraits.

The backdrop is removed by flood fill from the image border: only pixels connected
to the edge and close to the backdrop colour become transparent, so a white shirt
or highlight inside the figure is kept. Edge pixels get partial alpha to avoid a
hard halo. Writes <name>.png next to each source file; the source is left as is.

    python scripts/data/cutout-portraits.py public/players/kkr-2026/harshit-rana.jpg ...
"""
import sys
from collections import deque
from pathlib import Path

from PIL import Image

TOLERANCE = 38      # colour distance treated as backdrop
SOFT = 70           # up to this distance, edge pixels fade instead of cutting hard


def dist(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) ** 0.5


def cutout(src: Path) -> Path:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = tuple(sorted(c[i] for c in corners)[1] for i in range(3))  # robust to one odd corner

    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        r, g, b, a = px[x, y]
        d = dist((r, g, b), bg)
        if d > SOFT:
            continue  # figure: stop here
        px[x, y] = (r, g, b, 0 if d <= TOLERANCE else int(255 * (d - TOLERANCE) / (SOFT - TOLERANCE)))
        if d <= TOLERANCE:
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                    q.append((nx, ny))

    out = src.with_suffix(".png")
    im.save(out, optimize=True)
    cleared = sum(1 for y in range(h) for x in range(w) if px[x, y][3] == 0)
    print(f"{src.name} -> {out.name}  backdrop {bg}  cleared {100 * cleared / (w * h):.0f}%")
    return out


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        cutout(Path(arg))
