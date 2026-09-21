# -*- coding: utf-8 -*-
"""Flat archive-notebook button skins. Drawn to match app tokens, not photos."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'plate21' / 'module' / 'assets' / 'img' / 'ui'

PAPER = (244, 237, 220, 255)
PAPER2 = (235, 225, 203, 255)
INK = (70, 56, 42, 255)
CINNABAR = (166, 58, 46, 255)
BRASS = (169, 143, 95, 255)
OLIVE = (111, 114, 72, 230)
KRAFT = (210, 184, 140, 255)
ROPE = (196, 168, 120, 255)
HOLE = (138, 122, 96, 255)


def save(im, name):
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / name
    im.save(dest, 'PNG', optimize=True)
    print(dest, im.size, dest.stat().st_size)


def seal_label(w=720, h=176):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    m = 8
    d.rounded_rectangle([m, m, w - m - 1, h - m - 1], radius=14, fill=PAPER, outline=CINNABAR, width=4)
    d.rounded_rectangle([m + 10, m + 10, w - m - 11, h - m - 11], radius=10, outline=CINNABAR, width=2)
    return im


def ink_tag(w=720, h=176):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    body_left = 118
    m = 10
    # tag body
    d.rounded_rectangle([body_left, m, w - m - 1, h - m - 1], radius=10, fill=KRAFT, outline=INK, width=2)
    # left diamond head
    cx, cy = 70, h // 2
    head = [(body_left + 8, m), (28, m + 18), (18, cy), (28, h - m - 18), (body_left + 8, h - m - 1)]
    d.polygon(head, fill=KRAFT, outline=INK)
    d.line(head + [head[0]], fill=INK, width=2)
    # hole
    d.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], fill=PAPER2, outline=HOLE, width=3)
    px = im.load()
    for x in range(cx - 8, cx + 9):
        for y in range(cy - 8, cy + 9):
            if 0 <= x < w and 0 <= y < h and (x - cx) ** 2 + (y - cy) ** 2 <= 36:
                px[x, y] = (0, 0, 0, 0)
    d.arc([cx - 22, 8, cx + 22, 70], start=200, end=340, fill=ROPE, width=4)
    return im


def skip_tape(w=640, h=120):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    y0, y1 = 22, h - 22
    # torn left
    left = [(18, y0)]
    for i, yy in enumerate(range(y0, y1, 6)):
        left.append((8 if i % 2 else 20, yy))
    left.append((18, y1))
    right = [(w - 18, y1)]
    for i, yy in enumerate(range(y1, y0, -6)):
        right.append((w - 8 if i % 2 else w - 20, yy))
    right.append((w - 18, y0))
    d.polygon(left + [(w - 18, y1), (w - 18, y0)], fill=OLIVE)
    d.polygon([(18, y0)] + right, fill=OLIVE)
    d.rectangle([18, y0, w - 18, y1], fill=OLIVE)
    return im


def round_disc(s=256):
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    m = 18
    d.ellipse([m, m, s - m - 1, s - m - 1], fill=PAPER, outline=BRASS, width=5)
    d.ellipse([m + 8, m + 8, s - m - 9, s - m - 9], outline=(169, 143, 95, 90), width=1)
    return im


if __name__ == '__main__':
    save(seal_label(), 'btn-label-seal.png')
    save(ink_tag(), 'btn-label-ink.png')
    save(skip_tape(), 'btn-label-skip.png')
    save(round_disc(), 'btn-label-round.png')
