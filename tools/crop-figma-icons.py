"""Cut the back and menu icons out of the rendered new narrative frame.

Frame 5:6 is not used. The Images API is rate-limited, and these two icons
sit on a flat #d8bea0 band, so the band color can be removed exactly.
"""
import os
from PIL import Image

src = r"C:\Users\ASUS\AppData\Local\Temp\opencode\figma-cache\4x0FQff5l1vAbWt5kRpBym\1_40208\nodes\18_124@2x.png"
out = r"D:\kc\ymy-figma-ui\assets\figma"
image = Image.open(src).convert("RGBA")

def crop(box):
    x, y, w, h = [int(round(v * 2)) for v in box]
    return image.crop((x, y, x + w, y + h))

def key_band(icon):
    pixels = []
    for r, g, b, a in icon.getdata():
        if abs(r - 0xd8) <= 18 and abs(g - 0xbe) <= 18 and abs(b - 0xa0) <= 18:
            pixels.append((r, g, b, 0))
        else:
            pixels.append((r, g, b, a))
    icon.putdata(pixels)
    return icon

# 18:135 Subtract, 14x14 at frame 15,67. 18:138 menu, 16x12 at 358,68.
key_band(crop((15, 67, 14, 14))).save(os.path.join(out, "icon-back.png"))
key_band(crop((358, 68, 16, 12))).save(os.path.join(out, "icon-menu.png"))
# 19:601 listen pill group is the whole control at 348,114, 35x43.
# The guide pill is the sibling control directly below it, 35x43 at 348,166.
crop((348, 114, 35, 43)).save(os.path.join(out, "icon-listen.png"))
crop((348, 166, 35, 43)).save(os.path.join(out, "icon-guide.png"))
# Arch drawing, frame 18:194, clipped 7px at the top of the rendered frame.
arch = crop((88, 0, 55, 39))
pixels = []
for r, g, b, a in arch.getdata():
    luma = 0.3 * r + 0.5 * g + 0.2 * b
    pixels.append((r, g, b, 0 if luma >= 170 else 255))
arch.putdata(pixels)
arch.save(os.path.join(out, "icon-arch.png"))
print("icons written")
