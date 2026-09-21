# -*- coding: utf-8 -*-
"""Generate DJ-06 stems via local ComfyUI MiniMax Music3 (no cloud API).

lyrics='[inst]' so the encoder does not fill a vocal track.
"""
from __future__ import print_function

import argparse
import json
import os
import shutil
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROMPTS = os.path.join(ROOT, "tools", "xieqiqu_soundscape_prompts.json")
BASE = "http://127.0.0.1:8188"
COMFY_OUT = r"D:\AI\ComfyUI_windows_portable\ComfyUI\output"
DST = os.path.join(ROOT, "bgm", "xieqiqu-soundscape", "v2-stems")
SEEDS = {"pipa": 175106, "xiaolaqin": 175111, "xiyangxiao": 175117}
LYRICS = "[inst]\n(instrumental only, no singing, no speech)"


def http(url, data=None, timeout=60):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode() if data else None,
        headers={"Content-Type": "application/json"},
    )
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read())


def wait_comfy(timeout=180):
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
            "clip_name": "minimax_music3_text_encoder_pruned_int8_convrot.safetensors",
            "type": "minimax", "device": "default"}},
        "unet": {"class_type": "UNETLoader", "inputs": {
            "unet_name": "minimax_music3_dit_int8_convrot.safetensors",
            "weight_dtype": "default"}},
        "vae": {"class_type": "VAELoader", "inputs": {
            "vae_name": "minimax_music3_dav.safetensors"}},
        "enc": {"class_type": "MiniMaxMusic3TextEncode", "inputs": {
            "clip": ["clip", 0], "caption": caption, "lyrics": LYRICS,
            "seed": seed, "max_duration": duration, "cfg_scale": 1.7, "top_k": 50}},
        "neg": {"class_type": "ConditioningZeroOut", "inputs": {
            "conditioning": ["enc", 0]}},
        "lat": {"class_type": "EmptyMiniMaxMusic3LatentAudio", "inputs": {
            "seconds": ["enc", 1], "batch_size": 1}},
        "ks": {"class_type": "KSampler", "inputs": {
            "model": ["unet", 0], "positive": ["enc", 0], "negative": ["neg", 0],
            "latent_image": ["lat", 0], "seed": seed, "steps": 30, "cfg": 1.7,
            "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "dec": {"class_type": "VAEDecodeAudioTiled", "inputs": {
            "samples": ["ks", 0], "vae": ["vae", 0], "tile_size": 512, "overlap": 64}},
        "save": {"class_type": "SaveAudio", "inputs": {
            "audio": ["dec", 0], "filename_prefix": prefix}},
    }


def run_one(name, caption, duration=32.0):
    seed = SEEDS[name]
    prefix = "audio/xieqiqu-v2/" + name
    wf = build_workflow(caption, seed, duration, prefix)
    t0 = time.time()
    resp = http(BASE + "/prompt", {"prompt": wf, "client_id": "ymy-dj06-v2"})
    pid = resp["prompt_id"]
    print("[{0}] queued pid={1} seed={2}".format(name, pid, seed), flush=True)
    while True:
        time.sleep(6)
        h = http(BASE + "/history/" + pid)
        if pid not in h:
            print("[{0}] ...waiting {1:.0f}s".format(name, time.time() - t0), flush=True)
            continue
        entry = h[pid]
        st = entry.get("status", {})
        if st.get("status_str") == "error":
            msgs = [m for m in st.get("messages", []) if m[0] == "execution_error"]
            raise RuntimeError("{0} error: {1}".format(name, msgs[:1]))
        outs = entry.get("outputs", {})
        if "save" in outs:
            files = outs["save"].get("audio", []) or []
            print("[{0}] DONE in {1:.0f}s -> {2}".format(
                name, time.time() - t0, [f.get("filename") for f in files]), flush=True)
            return files
        print("[{0}] ...running {1:.0f}s".format(name, time.time() - t0), flush=True)


def copy_out(files, name):
    os.makedirs(DST, exist_ok=True)
    if not files:
        raise RuntimeError("no audio files for " + name)
    src_name = files[0]["filename"]
    sub = files[0].get("subfolder") or ""
    src = os.path.join(COMFY_OUT, sub, src_name) if sub else os.path.join(COMFY_OUT, src_name)
    if not os.path.isfile(src):
        alt = os.path.join(COMFY_OUT, "audio", "xieqiqu-v2", src_name)
        src = alt if os.path.isfile(alt) else src
    dst = os.path.join(DST, name + os.path.splitext(src_name)[1])
    shutil.copy2(src, dst)
    print("copied", src, "->", dst)
    return dst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", action="append", default=[])
    ap.add_argument("--duration", type=float, default=32.0)
    args = ap.parse_args()
    if not wait_comfy(12):
        raise SystemExit("ComfyUI not up on 127.0.0.1:8188")
    prompts = json.load(open(PROMPTS, encoding="utf-8"))
    names = args.only or ["pipa", "xiaolaqin", "xiyangxiao"]
    for name in names:
        files = run_one(name, prompts[name], args.duration)
        copy_out(files, name)
    return 0


if __name__ == "__main__":
    sys.exit(main())
