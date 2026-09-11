# -*- coding: utf-8 -*-
"""V2.2 语音（TTS）批量生成 —— edge-tts 驱动，产物不进 git、不进小程序包。

用法（在仓库根目录）:
  python tools/gen_voice.py            # 增量生成（已存在的 mp3 跳过）
  python tools/gen_voice.py --force    # 全部重生成
  python tools/gen_voice.py --only dlg-haiyantang-1   # 只生成指定 id（可多次）
  python tools/gen_voice.py --report   # 只输出时长报告（不生成）
  python tools/gen_voice.py --post     # 生成后 ffmpeg mono+loudnorm 后处理（需 ffmpeg）

声部表与文本在 tools/voice_manifest.json：
  - 台词（dlg-*）与页面 dialogue-block 逐字一致（V2.2 文稿为源）；
  - 导览（guide-*-base/-deep）对应 capabilities/audio-guide/scripts.js 两层文稿；
  - 旁白（narr-*）为各页「无标记正文段」（V2.2 音频主线）。

产物落 audio/v22/*.mp3；经 tools/serve_audio.py（或任意静态服务）对外提供，
小程序经 utils/audio-src.js 的 AUDIO_BASE 单常量取流。
"""
import argparse
import asyncio
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
MANIFEST = os.path.join(HERE, "voice_manifest.json")
OUT_DIR = os.path.join(ROOT, "audio", "v22")

CONCURRENCY = 4
RETRY = 3


def load_manifest():
    with open(MANIFEST, "r", encoding="utf-8") as f:
        return json.load(f)


async def synth_one(edge_tts, clip, cast_table, force=False, post=False):
    out_path = os.path.join(OUT_DIR, clip["id"] + ".mp3")
    if not force and os.path.exists(out_path) and os.path.getsize(out_path) > 1024:
        return {"id": clip["id"], "status": "skip"}
    cast = cast_table.get(clip.get("cast", "narrator")) or cast_table["narrator"]
    text = " ".join(clip["text"]) if isinstance(clip["text"], list) else clip["text"]
    last_err = None
    for attempt in range(1, RETRY + 1):
        try:
            comm = edge_tts.Communicate(
                text,
                cast["voice"],
                rate=cast.get("rate", "+0%"),
                pitch=cast.get("pitch", "+0Hz"),
            )
            await comm.save(out_path + ".tmp.mp3")
            os.replace(out_path + ".tmp.mp3", out_path)
            if post:
                postprocess(out_path)
            return {"id": clip["id"], "status": "ok"}
        except Exception as e:  # noqa: BLE001 - 网络抖动重试
            last_err = e
            await asyncio.sleep(1.5 * attempt)
    return {"id": clip["id"], "status": "error", "error": str(last_err)}


def postprocess(path):
    """ffmpeg 后处理：单声道 + 响度归一（I=-18）。失败保留原文件。"""
    ffmpeg = "ffmpeg"
    tmp = path + ".post.mp3"
    cmd = [
        ffmpeg, "-y", "-loglevel", "error", "-i", path,
        "-ac", "1", "-af", "loudnorm=I=-18:TP=-1.5:LRA=11",
        "-b:a", "48k", tmp,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=120)
        os.replace(tmp, path)
    except Exception:  # noqa: BLE001 - ffmpeg 缺失/失败不阻断
        if os.path.exists(tmp):
            os.remove(tmp)


def duration_of(path):
    """ffprobe 取时长（秒）；不可用则回退 0。"""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nw=1:nk=1", path],
            check=True, capture_output=True, timeout=30,
        )
        return float(out.stdout.decode().strip())
    except Exception:  # noqa: BLE001
        return 0.0


async def run(args):
    import edge_tts  # 延迟导入，--report 无需联网

    data = load_manifest()
    cast_table = data["casts"]
    clips = data["clips"]
    if args.only:
        wanted = set(args.only)
        clips = [c for c in clips if c["id"] in wanted]
    os.makedirs(OUT_DIR, exist_ok=True)

    sem = asyncio.Semaphore(CONCURRENCY)
    results = []

    async def worker(clip):
        async with sem:
            return await synth_one(edge_tts, clip, cast_table, force=args.force, post=args.post)

    t0 = time.time()
    results = await asyncio.gather(*(worker(c) for c in clips))
    ok = sum(1 for r in results if r["status"] == "ok")
    skip = sum(1 for r in results if r["status"] == "skip")
    err = [r for r in results if r["status"] == "error"]
    print(f"generated={ok} skipped={skip} errors={len(err)} in {time.time()-t0:.0f}s")
    for r in err:
        print("  ERROR", r["id"], r.get("error", "")[:160])
    report(clips)
    return 0 if not err else 1


def report(clips=None):
    """时长报告：逐条 + 按站点聚合（红线：单站人声合计 ≤90s 按站点核对）。"""
    if clips is None:
        clips = load_manifest()["clips"]
    rows = []
    for c in clips:
        p = os.path.join(OUT_DIR, c["id"] + ".mp3")
        d = duration_of(p) if os.path.exists(p) else None
        rows.append((c["id"], c.get("speaker", ""), d))
    station_total = {}
    for cid, speaker, d in rows:
        if d is None or not cid.startswith("dlg-"):
            continue
        station = cid.split("-", 2)[1]
        station_total.setdefault(station, 0.0)
        station_total[station] += d
    total = sum(d for _, _, d in rows if d)
    print(f"{'clip':34s} {'speaker':10s} {'sec':>6s}")
    for cid, speaker, d in rows:
        print(f"{cid:34s} {speaker:10s} {('%6.1f' % d) if d else '   ---':>6s}")
    print("-- station dialogue totals (red line: <=90s per station) --")
    for station, d in sorted(station_total.items()):
        flag = "OVER!" if d > 90 else "ok"
        print(f"  {station:14s} {d:6.1f}s  {flag}")
    print(f"TOTAL {total/60:.1f} min")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--post", action="store_true", help="ffmpeg mono+loudnorm")
    ap.add_argument("--only", action="append", help="only these clip ids")
    ap.add_argument("--report", action="store_true", help="duration report only")
    args = ap.parse_args()
    if args.report:
        report()
        return 0
    return asyncio.run(run(args))


if __name__ == "__main__":
    sys.exit(main())
