# -*- coding: utf-8 -*-
"""Download the 20 Xiyanglou copperplates from the Palace Museum collection page."""
from __future__ import annotations

import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "plates-20"

# 核对详本 west-to-east order; palace_id from dpm.org.cn 故00009171
PLATES = [
    (1, "谐奇趣南面", "xieqiqu-south", 9007),
    (2, "谐奇趣北面", "xieqiqu-north", 8990),
    (3, "蓄水楼东面", "xushuilou-east", 8991),
    (4, "花园门北面", "huayuanmen-north", 8992),
    (5, "花园正面", "huayuan-front", 8993),
    (6, "养雀笼西面", "yangquelong-west", 8994),
    (7, "养雀笼东面", "yangquelong-east", 8995),
    (8, "方外观正面", "fangwaiguan-front", 8996),
    (9, "竹亭北面", "zhuting-north", 8997),
    (10, "海晏堂西面", "haiyantang-west", 8998),
    (11, "海晏堂北面", "haiyantang-north", 8999),
    (12, "海晏堂东面", "haiyantang-east", 9008),
    (13, "海晏堂南面", "haiyantang-south", 9000),
    (14, "远瀛观正面", "yuanyingguan-front", 9001),
    (15, "大水法南面", "dashuifa-south", 9002),
    (16, "观水法正面", "guanshuifa-front", 9003),
    (17, "线法山门正面", "xianfashan-gate", 9004),
    (18, "线法山正面", "xianfashan-front", 9005),
    (19, "线法山东门", "xianfashan-east-gate", 9006),
    (20, "湖东线法画", "hudong-xianfahua", 9009),
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Referer": "https://www.dpm.org.cn/collection/paint/228650.html",
}


def download(url: str, dest: Path) -> int:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    dest.write_bytes(data)
    return len(data)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for n, zh, slug, pid in PLATES:
        dest = OUT / f"{n:02d}-{slug}.jpg"
        url = f"https://img.dpm.org.cn/Uploads/Picture/dc/{pid}%5B1024%5D.jpg"
        size = download(url, dest)
        if dest.read_bytes()[:2] != b"\xff\xd8":
            raise SystemExit(f"not jpeg: {dest}")
        rows.append(
            {
                "n": n,
                "name": zh,
                "file": dest.name,
                "palace_id": pid,
                "bytes": size,
                "source": "故宫博物院《圆明园铜版画》册 故00009171",
                "page": "https://www.dpm.org.cn/collection/paint/228650.html",
                "image": f"https://img.dpm.org.cn/Uploads/Picture/dc/{pid}[1024].jpg",
            }
        )
        print(f"{n:02d} {zh} {size}", flush=True)
    (OUT / "manifest.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
