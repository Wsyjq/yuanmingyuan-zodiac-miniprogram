"""Compress Figma image fills that are not exclusive to the low-fi frame."""
import os
import sys

from PIL import Image

cache, out = sys.argv[1], sys.argv[2]
fills = os.path.join(cache, "image-fills")
os.makedirs(out, exist_ok=True)

def save_jpeg(src, dest, size, quality):
    image = Image.open(os.path.join(fills, src)).convert("RGB")
    image = image.resize(size, Image.Resampling.LANCZOS)
    image.save(dest, "JPEG", quality=quality, optimize=True)

def save_png(src, dest, size):
    image = Image.open(os.path.join(fills, src)).convert("RGBA")
    image = image.resize(size, Image.Resampling.LANCZOS)
    image.save(dest, "PNG", optimize=True)

# Rectangle 1 on the new frames. Full-bleed paper, no alpha.
save_jpeg(
    "1103282a45df4e1064aa4c423a93180171e4f52f.png",
    os.path.join(out, "paper.jpg"),
    (786, 1702),
    72,
)
# Entry frame background, used only by pages/index.
save_jpeg(
    "ace2d7a51471079cbfc33eca7ba9f41613a3690c.png",
    os.path.join(out, "paper-entry.jpg"),
    (600, 1297),
    60,
)
# Bottom hills. Keep alpha; display size is 393x172.
save_png(
    "5d2c63d3dcbfed6d2c5bc2fa3986403c53b1cb9e.png",
    os.path.join(out, "hills.png"),
    (786, 344),
)
# Decorative wash. Keep alpha and crop nothing: the frame positions the full image.
wash = Image.open(os.path.join(fills, "e3a41d6d76b7ac0c7c188b099c7a127e3ab60720.png")).convert("RGBA")
wash = wash.resize((512, 768), Image.Resampling.LANCZOS)
wash.save(os.path.join(out, "wash.png"), "PNG", optimize=True)
for name in ("paper.jpg", "paper-entry.jpg", "hills.png", "wash.png"):
    print(name, os.path.getsize(os.path.join(out, name)))
