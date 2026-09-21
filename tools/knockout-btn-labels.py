# -*- coding: utf-8 -*-
"""Knock out studio/checkerboard backgrounds and crop generated label photos to PNG."""
from collections import deque
from pathlib import Path

from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(r'C:\Users\ASUS\.grok\sessions\d%3A%5Ckc%5Cymy\01a0b43d-3457-7b62-af99-35b1396f3219\images')
OUT = ROOT / 'plate21' / 'module' / 'assets' / 'img' / 'ui'


def flood_knockout(im, luma_min=175, sat_max=22):
    arr = np.array(im.convert('RGBA'))
    h, w = arr.shape[:2]
    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (0, h // 2)):
        q.append((x, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y, x]:
            continue
        visited[y, x] = True
        r, g, b, a = arr[y, x]
        mx, mn = int(max(r, g, b)), int(min(r, g, b))
        luma = 0.299 * r + 0.587 * g + 0.114 * b
        if (mx - mn) <= sat_max and luma >= luma_min:
            arr[y, x, 3] = 0
            q.append((x + 1, y))
            q.append((x - 1, y))
            q.append((x, y + 1))
            q.append((x, y - 1))
    return Image.fromarray(arr)


def crop_alpha(im, pad=8):
    a = np.array(im.split()[-1])
    ys, xs = np.where(a > 12)
    if len(xs) == 0:
        return im
    left, right = int(xs.min()), int(xs.max())
    top, bottom = int(ys.min()), int(ys.max())
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(im.width - 1, right + pad)
    bottom = min(im.height - 1, bottom + pad)
    return im.crop((left, top, right + 1, bottom + 1))


def run(name, src_name, luma_min=175):
    src = SRC / src_name
    im = flood_knockout(Image.open(src), luma_min=luma_min)
    im = crop_alpha(im)
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / name
    im.save(dest, 'PNG')
    print(dest, im.size, 'alpha')


if __name__ == '__main__':
    run('btn-label-seal.png', '1.jpg', luma_min=210)
    run('btn-label-round.png', '2.jpg', luma_min=210)
    run('btn-label-ink.png', '3.jpg', luma_min=188)
    run('btn-label-skip.png', '4.jpg', luma_min=188)
