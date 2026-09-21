# -*- coding: utf-8 -*-
"""Mix DJ-06 谐奇趣声景 30s: water + pipa@5s + xiaolaqin@11s + xiyangxiao@17s.

Stems are MiniMax-Music-3 solos (ComfyUI output). Water defaults to a
procedural fountain bed because Music-3 'ambience' usually grows a melody.
Pass --water-src to use a generated water take instead.

Usage (repo root):
  python tools/mix_xieqiqu_soundscape.py
  python tools/mix_xieqiqu_soundscape.py --water-src path/to/water.flac
"""
from __future__ import print_function

import argparse
import glob
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMFY_OUT = r"D:\AI\ComfyUI_windows_portable\ComfyUI\output\audio\xieqiqu-ss"
DST = os.path.join(ROOT, "bgm", "xieqiqu-soundscape")
DURATION = 30.0
# No-water mix: ~0.8s pad, instruments keep 6s entry spacing, master fade in/out.
MIX_FADE_IN = 0.6
MIX_FADE_OUT = 2.2
LAYERS = {
    "pipa": {"delay_ms": 800, "play": 28.5, "fade_in": 1.1, "fade_out": 2.4, "vol": 0.95},
    "xiaolaqin": {"delay_ms": 6800, "play": 22.5, "fade_in": 0.7, "fade_out": 2.2, "vol": 0.90},
    "xiyangxiao": {"delay_ms": 12800, "play": 16.5, "fade_in": 0.7, "fade_out": 2.0, "vol": 0.92},
}

PROBE_TIMES = (1, 8, 14, 20, 25, 29)


def run(cmd, check=True):
    print("+", " ".join(cmd[:8]), "..." if len(cmd) > 8 else "")
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if check and p.returncode != 0:
        sys.stderr.write(p.stderr.decode("utf-8", "replace")[-2000:])
        raise SystemExit(p.returncode)
    return p


def ffprobe_dur(path):
    p = run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "csv=p=0", path,
    ])
    try:
        return float(p.stdout.decode().strip())
    except ValueError:
        return 0.0


def latest_stem(name, folder):
    hits = []
    for ext in (".flac", ".wav", ".mp3"):
        hits += sorted(glob.glob(os.path.join(folder, name + "*" + ext)))
    if not hits:
        return None
    return hits[-1]


def extend_if_short(src, need, folder, tag):
    """Self-acrossfade until duration >= need. MiniMax often stops ~16s."""
    dur = ffprobe_dur(src)
    if dur >= need - 0.2:
        return src
    reps = 2
    out = os.path.join(folder, "_{0}_ext.flac".format(tag))
    fade = min(2.5, max(1.2, dur * 0.12))
    while True:
        inputs = []
        for _ in range(reps):
            inputs += ["-i", src]
        filters = "[0:a][1:a]acrossfade=d={0}:c1=tri:c2=tri".format(fade)
        last = "[2:a]" if reps > 2 else None
        if reps > 2:
            filters = "[0:a][1:a]acrossfade=d={0}:c1=tri:c2=tri[a1]; [a1][2:a]acrossfade=d={0}:c1=tri:c2=tri".format(fade)
        run(["ffmpeg", "-y", "-loglevel", "error"] + inputs + [
            "-filter_complex", filters, out,
        ])
        dur = ffprobe_dur(out)
        print("extended {0}: {1:.1f}s (reps={2})".format(tag, dur, reps))
        if dur >= need - 0.2 or reps >= 4:
            return out
        reps += 1
        src = out


def make_procedural_water(out_path):
    """Quiet palace fountain: mid-high spray, little bass. Not a waterfall."""
    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "lavfi", "-i", "anoisesrc=d=30:c=white:r=48000:seed=1751",
        "-filter_complex",
        "highpass=f=700,lowpass=f=7500,asplit=3[a][b][c];"
        "[a]bandpass=f=1600:width_type=h:w=900,volume=0.22[spray];"
        "[b]bandpass=f=3400:width_type=h:w=1400,volume=0.14[mist];"
        "[c]aecho=0.45:0.35:22:0.10,volume=0.05[echo];"
        "[spray][mist][echo]amix=inputs=3:duration=first:dropout_transition=0,"
        "alimiter=limit=0.50,atrim=0:30,volume=0.40",
        "-c:a", "pcm_s16le", out_path,
    ])


def layer_filter(idx, spec):
    fade_out_st = max(0.2, spec["play"] - spec["fade_out"])
    return (
        "[{i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,"
        "atrim=0:{play},asetpts=N/SR/TB,"
        "afade=t=in:st=0:d={fi},"
        "afade=t=out:st={fo}:d={fd},"
        "adelay={delay}|{delay},"
        "apad=whole_dur={dur},"
        "atrim=0:{dur},volume={vol}[l{i}]"
    ).format(
        i=idx, play=spec["play"], fi=spec["fade_in"], fo=fade_out_st,
        fd=spec["fade_out"], delay=spec["delay_ms"], dur=DURATION, vol=spec["vol"],
    )


def mix(water, stems, out_mp3, water_vol=0.45):
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", water]
    filters = [
        "[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,"
        "atrim=0:{d},apad=whole_dur={d},volume={v}[w]".format(
            d=DURATION, v=water_vol)
    ]
    labels = ["[w]"]
    for i, key in enumerate(("pipa", "xiaolaqin", "xiyangxiao"), start=1):
        cmd += ["-i", stems[key]]
        filters.append(layer_filter(i, LAYERS[key]))
        labels.append("[l{i}]".format(i=i))
    fo = max(0.2, DURATION - MIX_FADE_OUT)
    filters.append(
        "{ins}amix=inputs=4:duration=first:dropout_transition=2:normalize=0,"
        "afade=t=in:st=0:d={fi},"
        "afade=t=out:st={fo}:d={fd},"
        "alimiter=limit=0.89[out]".format(
            ins="".join(labels), fi=MIX_FADE_IN, fo=fo, fd=MIX_FADE_OUT)
    )
    cmd += [
        "-filter_complex", ";".join(filters),
        "-map", "[out]", "-t", str(DURATION),
        "-codec:a", "libmp3lame", "-b:a", "192k", out_mp3,
    ]
    run(cmd)


def mean_volume(path, t, which="mono"):
    if which == "mono":
        af = "volumedetect"
    else:
        af = "pan=mono|c0=c{c},volumedetect".format(c=0 if which == "L" else 1)
    p = run([
        "ffmpeg", "-loglevel", "info", "-ss", str(t), "-t", "1.2",
        "-i", path, "-af", af, "-f", "null", "-",
    ], check=False)
    err = p.stderr.decode("utf-8", "replace")
    for line in err.splitlines():
        if "mean_volume" in line:
            return line.strip().split("mean_volume:")[-1].strip()
    return "?"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--water-src", help="generated water flac/wav; default = procedural")
    ap.add_argument("--comfy-out", default=COMFY_OUT)
    ap.add_argument("--stems-dir", help="folder with pipa/xiaolaqin/xiyangxiao stems")
    ap.add_argument("--out", help="output mp3 path")
    ap.add_argument("--water-vol", type=float, default=1.8,
                    help="linear gain on fountain bed in the mix (v1 used 3.6 and drowned instruments)")
    ap.add_argument("--no-water", action="store_true",
                    help="drop the fountain bed; first 5s and last 3s stay silent")
    ap.add_argument("--also-mmwater", action="store_true")
    args = ap.parse_args()
    folder = args.stems_dir or args.comfy_out

    os.makedirs(DST, exist_ok=True)
    stems = {}
    for key in ("pipa", "xiaolaqin", "xiyangxiao"):
        p = latest_stem(key, folder)
        if not p:
            raise SystemExit("missing stem {k} in {d}".format(k=key, d=folder))
        need = LAYERS[key]["play"]
        p = extend_if_short(p, need, DST, key)
        stems[key] = p
        print("{k}: {p} ({d:.1f}s, need {n:.0f}s)".format(
            k=key, p=p, d=ffprobe_dur(p), n=need))

    if args.no_water:
        water_proc = os.path.join(DST, "_silence_30s.wav")
        run([
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo:d=30",
            "-c:a", "pcm_s16le", water_proc,
        ])
        water_vol = 0.0
    else:
        water_proc = os.path.join(DST, "_water_procedural.wav")
        make_procedural_water(water_proc)
        water_vol = args.water_vol

    out_a = args.out or os.path.join(DST, "dj06-xieqiqu-soundscape-30s.mp3")
    mix(water_proc, stems, out_a, water_vol=water_vol)
    print("wrote", out_a, "{:.1f}s".format(ffprobe_dur(out_a)))

    if args.also_mmwater:
        water_gen = args.water_src or latest_stem("water", folder)
        if water_gen:
            out_b = os.path.join(DST, "dj06-xieqiqu-soundscape-30s-mmwater.mp3")
            mix(water_gen, stems, out_b, water_vol=args.water_vol)
            print("wrote", out_b, "{:.1f}s".format(ffprobe_dur(out_b)))

    print("=== energy @ t (1=fade-in, 8=+pipa, 14=+qin, 20=+xiao, 25=tutti, 29=fade-out) ===")
    for t in PROBE_TIMES:
        print("  t={:>2}s  {}".format(t, mean_volume(out_a, t)))


if __name__ == "__main__":
    main()
