# -*- coding: utf-8 -*-
"""Generate DJ-06 谐奇趣 instrument stems via MiniMax music-3.0.

Uses is_instrumental=true so the model does not add lyrics/singing.
Water is NOT generated here (mix script synthesizes a quiet fountain bed).

Usage (repo root):
  python tools/gen_xieqiqu_stems.py
  python tools/gen_xieqiqu_stems.py --only pipa
"""
from __future__ import print_function

import argparse
import json
import os
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROMPTS = os.path.join(ROOT, "tools", "xieqiqu_soundscape_prompts.json")
DEFAULT_OUT = os.path.join(ROOT, "bgm", "xieqiqu-soundscape", "v2-stems")
RETRY = 3


def load_env():
    path = os.path.join(ROOT, ".env")
    if not os.path.isfile(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


def minimax_post(path, body, timeout=240):
    load_env()
    base = os.environ.get("MINIMAX_BASE", "https://api.minimax.cn").rstrip("/")
    key = os.environ.get("MINIMAX_API_KEY")
    if not key:
        raise RuntimeError("MINIMAX_API_KEY not set")
    req = urllib.request.Request(
        base + path,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
        },
    )
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read())


def save_audio(resp, out_path):
    data = resp.get("data") or {}
    audio = data.get("audio") or ""
    if audio.startswith("http"):
        urllib.request.urlretrieve(audio, out_path)
        return
    if not audio:
        raise RuntimeError("empty audio in response (status=%s)" % data.get("status"))
    try:
        raw = bytes.fromhex(audio)
    except ValueError:
        import base64
        raw = base64.b64decode(audio)
    with open(out_path, "wb") as f:
        f.write(raw)


def gen_one(name, prompt, out_dir):
    body = {
        "model": os.environ.get("MINIMAX_MUSIC_MODEL", "music-3.0"),
        "prompt": prompt,
        "is_instrumental": True,
        "lyrics_optimizer": False,
        "output_format": "hex",
        "aigc_watermark": False,
        "audio_setting": {
            "sample_rate": 44100,
            "bitrate": 256000,
            "format": "mp3",
        },
    }
    last_err = None
    for attempt in range(1, RETRY + 1):
        try:
            print("gen {0} attempt {1}/{2} ...".format(name, attempt, RETRY))
            resp = minimax_post("/v1/music_generation", body)
            code = (resp.get("base_resp") or {}).get("status_code", 0)
            msg = (resp.get("base_resp") or {}).get("status_msg", "")
            if code != 0:
                raise RuntimeError("minimax {0}: {1}".format(code, msg))
            extra = resp.get("extra_info") or {}
            out_path = os.path.join(out_dir, name + ".mp3")
            save_audio(resp, out_path)
            dur_ms = extra.get("music_duration") or 0
            print("wrote {0} ({1:.1f}s, {2} bytes)".format(
                out_path, dur_ms / 1000.0, os.path.getsize(out_path)))
            return out_path
        except Exception as e:
            last_err = e
            print("FAIL {0}: {1}".format(name, e))
            if attempt < RETRY:
                time.sleep(4 * attempt)
    raise RuntimeError("gave up on {0}: {1}".format(name, last_err))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--only", action="append", default=[])
    args = ap.parse_args()
    with open(PROMPTS, "r", encoding="utf-8") as f:
        prompts = json.load(f)
    os.makedirs(args.out, exist_ok=True)
    names = args.only or ["pipa", "xiaolaqin", "xiyangxiao"]
    for name in names:
        if name not in prompts:
            raise SystemExit("unknown stem {0}".format(name))
        gen_one(name, prompts[name], args.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
