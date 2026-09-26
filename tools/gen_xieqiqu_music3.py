# -*- coding: utf-8 -*-
"""谐奇趣 DJ-06 声景 v3 候选生成：本地 ComfyUI MiniMax Music3 整段合奏。

v2 声景按“听音辨认乐器”设计（琵琶/小拉琴/西洋箫三条独奏轨按时序混入），
v3 起不再要求辨认，只求好听：单段完整合奏，30 秒，无水声、无人声。

用法（仓库根目录）:
  python tools/gen_xieqiqu_music3.py --all
  python tools/gen_xieqiqu_music3.py --variant warm --seed 1751
  python tools/gen_xieqiqu_music3.py --post-only     # 只重做 ffmpeg 后处理

生成记录（模型、提示词、种子、时长、SHA-256）追加写入候选目录 manifest.json。
候选 MP3 位于 docs/compliance/sources-audio/xieqiqu-music-v3/candidates/，
不进入发布包；选定后由人工替换 voice-a 成品并跑 npm run resources:refresh。
"""
from __future__ import print_function

import argparse
import glob
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "http://127.0.0.1:8188"
COMFY_OUT = r"D:\AI\ComfyUI_windows_portable\ComfyUI\output\xq3"
DST = os.path.join(ROOT, "docs", "compliance", "sources-audio", "xieqiqu-music-v3")
CANDIDATES = os.path.join(DST, "candidates")

MODEL = {
    "clip": "minimax_music3_text_encoder_pruned_int8_convrot.safetensors",
    "unet": "minimax_music3_dit_int8_convrot.safetensors",
    "vae": "minimax_music3_dav.safetensors",
}
LYRICS = "[inst]\n(instrumental only, no singing, no speech)"
TARGET_SECONDS = 30.0
GEN_SECONDS = 32.0
CFG_SCALE = 1.7
TOP_K = 50
STEPS = 30
FADE_IN = 0.5
FADE_OUT = 1.8
LOUDNORM = "loudnorm=I=-16:TP=-1.5:LRA=11"

NO_VOCAL = ("No vocals, no singing, no speech, no lyrics, no choir, "
            "no water sounds, no fountain, no percussion track.")
TAIL = ("Continuous instrumental performance filling the whole 30 seconds, "
        "steady musical flow without early ending, a gentle resolve only in the "
        "final bars. " + NO_VOCAL)

VARIANTS = {
    "warm": (
        "Elegant Qing court music where Chinese and Western instruments meet. "
        "Warm intimate chamber ensemble: plucked pipa and guzheng woven with "
        "baroque strings and a soft wooden flute, tender pentatonic melody over "
        "simple western harmony in D minor, slow graceful tempo about 76 BPM, "
        "candlelight in a marble palace, beautiful and moving. " + TAIL),
    "lively": (
        "Lively yet refined Qing court chamber dance. Bright pipa plucks and "
        "yangqin sparkles answered by baroque violin and light wooden flute, "
        "elegant dance rhythm about 104 BPM, D major with pentatonic colour, "
        "playful graceful ornaments, small ensemble, joyful but tasteful. " + TAIL),
    "airy": (
        "Serene air for a quiet evening hall. Solo wooden flute singing a long "
        "pentatonic phrase over soft sustained strings and occasional pipa "
        "harmonics, very slow about 62 BPM, spacious and poetic, delicate "
        "reverb, calm and deeply beautiful, settling into stillness. " + TAIL),
    "grand": (
        "Splendid Chinese-Western fusion ensemble in a grand palace hall. "
        "Pipa, guzheng, baroque strings and woodwinds with light bronze chimes, "
        "noble sweeping melody mixing pentatonic and baroque harmony in G minor, "
        "stately tempo about 88 BPM, luminous and cinematic, graceful close. " + TAIL),
}

# 每个变体固定种子，保证可复现；尾号 11xxxx 为“禁止提前收尾”提示词补滚批
SEEDS = {
    "warm": [1751, 175106],
    "lively": [1759, 175924, 110411, 110412],
    "airy": [1745, 174507, 110451],
    "grand": [1760, 176010, 110601, 110602, 110603],
}


def http(url, data=None, timeout=60):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8") if data else None,
        headers={"Content-Type": "application/json"},
    )
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read())


def wait_comfy(timeout=120):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            http(BASE + "/system_stats")
            return True
        except Exception:
            time.sleep(2)
    return False


def build_workflow(caption, seed, duration, prefix):
    return {
        "clip": {"class_type": "CLIPLoader", "inputs": {
            "clip_name": MODEL["clip"], "type": "minimax", "device": "default"}},
        "unet": {"class_type": "UNETLoader", "inputs": {
            "unet_name": MODEL["unet"], "weight_dtype": "default"}},
        "vae": {"class_type": "VAELoader", "inputs": {"vae_name": MODEL["vae"]}},
        "enc": {"class_type": "MiniMaxMusic3TextEncode", "inputs": {
            "clip": ["clip", 0], "caption": caption, "lyrics": LYRICS,
            "seed": seed, "max_duration": duration,
            "cfg_scale": CFG_SCALE, "top_k": TOP_K}},
        "neg": {"class_type": "ConditioningZeroOut", "inputs": {
            "conditioning": ["enc", 0]}},
        "lat": {"class_type": "EmptyMiniMaxMusic3LatentAudio", "inputs": {
            "seconds": ["enc", 1], "batch_size": 1}},
        "ks": {"class_type": "KSampler", "inputs": {
            "model": ["unet", 0], "positive": ["enc", 0], "negative": ["neg", 0],
            "latent_image": ["lat", 0], "seed": seed, "steps": STEPS,
            "cfg": CFG_SCALE, "sampler_name": "euler", "scheduler": "simple",
            "denoise": 1.0}},
        "dec": {"class_type": "VAEDecodeAudioTiled", "inputs": {
            "samples": ["ks", 0], "vae": ["vae", 0],
            "tile_size": 512, "overlap": 64}},
        "save": {"class_type": "SaveAudio", "inputs": {
            "audio": ["dec", 0], "filename_prefix": prefix}},
    }


def ffprobe_dur(path):
    p = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        return float(p.stdout.decode().strip())
    except ValueError:
        return 0.0


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def postprocess(src_flac, out_mp3):
    """响度归一 + 淡入淡出 + 裁到 30 秒；原曲不足 30 秒时保留自然长度并记录。"""
    dur = ffprobe_dur(src_flac)
    if dur <= 0:
        raise SystemExit("无法读取时长: " + src_flac)
    fade_out_start = max(0.0, min(dur, TARGET_SECONDS) - FADE_OUT)
    filters = "%s,afade=t=in:st=0:d=%.2f,afade=t=out:st=%.2f:d=%.2f" % (
        LOUDNORM, FADE_IN, fade_out_start, FADE_OUT)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", src_flac,
           "-af", filters, "-t", "%.2f" % TARGET_SECONDS,
           "-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "192k", out_mp3]
    subprocess.run(cmd, check=True)
    return dur


def candidate_name(variant, seed):
    return "xq3-%s-%d" % (variant, seed)


def manifest_path():
    return os.path.join(CANDIDATES, "manifest.json")


def manifest_load():
    try:
        with open(manifest_path(), "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"model": MODEL, "params": {
            "lyrics": LYRICS, "steps": STEPS, "cfg_scale": CFG_SCALE,
            "top_k": TOP_K, "gen_seconds": GEN_SECONDS,
            "target_seconds": TARGET_SECONDS,
            "fade_in": FADE_IN, "fade_out": FADE_OUT,
            "loudnorm": LOUDNORM}, "candidates": []}


def manifest_append(entry):
    data = manifest_load()
    data["candidates"] = [c for c in data["candidates"]
                          if c["name"] != entry["name"]] + [entry]
    os.makedirs(CANDIDATES, exist_ok=True)
    with open(manifest_path(), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def generate_one(variant, seed, skip_existing=True):
    if variant not in VARIANTS:
        raise SystemExit("未知变体: %s（可选 %s）" % (variant, ", ".join(VARIANTS)))
    if skip_existing:
        out_mp3 = os.path.join(CANDIDATES, candidate_name(variant, seed) + ".mp3")
        if os.path.exists(out_mp3):
            print("[%s] 已存在，跳过（--force 需手动删除后重跑）" % candidate_name(variant, seed),
                  flush=True)
            return None
    if not wait_comfy():
        raise SystemExit("ComfyUI 未启动（%s）。先运行 run_nvidia_gpu.bat。" % BASE)

    name = candidate_name(variant, seed)
    prefix = "xq3/" + name
    wf = build_workflow(VARIANTS[variant], seed, GEN_SECONDS, prefix)
    t0 = time.time()
    resp = http(BASE + "/prompt", {"prompt": wf, "client_id": "ymy-xq3"})
    pid = resp["prompt_id"]
    print("[%s] queued pid=%s seed=%d" % (name, pid, seed), flush=True)

    flac = None
    while True:
        time.sleep(6)
        hist = http("%s/history/%s" % (BASE, pid))
        if pid not in hist:
            continue
        status = hist[pid].get("status", {})
        if status.get("status_str") == "error" or not status.get("completed", True):
            msgs = [m for m in status.get("messages", [])
                    if m[0] == "execution_error"]
            print("[%s] ERROR %s" % (name, json.dumps(msgs, ensure_ascii=False)[:600]),
                  flush=True)
            return None
        outs = hist[pid].get("outputs", {})
        if "save" in outs:
            files = outs["save"].get("audio", [])
            if files:
                flac = os.path.join(COMFY_OUT, files[0]["filename"])
            break
        print("[%s] ...running %.0fs" % (name, time.time() - t0), flush=True)

    if not flac or not os.path.exists(flac):
        print("[%s] 未找到输出文件" % name, flush=True)
        return None

    os.makedirs(CANDIDATES, exist_ok=True)
    out_mp3 = os.path.join(CANDIDATES, name + ".mp3")
    src_dur = postprocess(flac, out_mp3)
    entry = {
        "name": name,
        "variant": variant,
        "seed": seed,
        "caption": VARIANTS[variant],
        "source_flac": flac,
        "generated_seconds": round(src_dur, 2),
        "file": os.path.relpath(out_mp3, ROOT).replace("\\", "/"),
        "bytes": os.path.getsize(out_mp3),
        "sha256": sha256_file(out_mp3),
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "elapsed_seconds": round(time.time() - t0, 1),
    }
    manifest_append(entry)
    print("[%s] DONE %.0fs 生成 %.2fs -> %s" % (
        name, time.time() - t0, src_dur, entry["file"]), flush=True)
    return entry


def post_only():
    """把 COMFY_OUT 里已有 flac 重新后处理成候选 MP3 并登记。"""
    hits = sorted(glob.glob(os.path.join(COMFY_OUT, "xq3-*_00001.flac")))
    if not hits:
        raise SystemExit("未找到已有 flac: " + COMFY_OUT)
    for flac in hits:
        base = os.path.basename(flac).split("_00001")[0]
        parts = base.split("-")
        variant, seed = parts[1], int(parts[2])
        os.makedirs(CANDIDATES, exist_ok=True)
        out_mp3 = os.path.join(CANDIDATES, base + ".mp3")
        src_dur = postprocess(flac, out_mp3)
        entry = {
            "name": base, "variant": variant, "seed": seed,
            "caption": VARIANTS.get(variant, ""),
            "source_flac": flac,
            "generated_seconds": round(src_dur, 2),
            "file": os.path.relpath(out_mp3, ROOT).replace("\\", "/"),
            "bytes": os.path.getsize(out_mp3),
            "sha256": sha256_file(out_mp3),
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "elapsed_seconds": None,
        }
        manifest_append(entry)
        print("[%s] post %.2fs -> %s" % (base, src_dur, entry["file"]), flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--variant", choices=sorted(VARIANTS))
    ap.add_argument("--seed", type=int)
    ap.add_argument("--post-only", action="store_true")
    a = ap.parse_args()

    if a.post_only:
        post_only()
        return
    if a.all:
        for variant in sorted(VARIANTS):
            for seed in SEEDS[variant]:
                generate_one(variant, seed)
        return
    if not a.variant:
        ap.error("需要 --all 或 --variant")
    seeds = SEEDS[a.variant] if a.seed is None else [a.seed]
    for seed in seeds:
        generate_one(a.variant, seed)


if __name__ == "__main__":
    main()
