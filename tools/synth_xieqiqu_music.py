# -*- coding: utf-8 -*-
"""谐奇趣 DJ-06 声景 v3 · 程序化作曲与合成（产线 B，零版权风险）。

不用任何音频模型：这里写曲谱（拍号、和声、旋律），再用 numpy 合成音色
（拨弦加法合成、擦弦锯齿波、木管正弦+气声），scipy 做滤波，合成混响 IR，
最后与 Music3 候选走同一条 ffmpeg 母带链（loudnorm + 淡入淡出 + 30 秒）。

用法（仓库根目录）:
  python tools/synth_xieqiqu_music.py --all
  python tools/synth_xieqiqu_music.py --piece b1

输出: docs/compliance/sources-audio/xieqiqu-music-v3/synth/xq3-synth-*.mp3
记录: 同目录 manifest.json（编配、BPM、参数、SHA-256）
"""
from __future__ import print_function

import argparse
import hashlib
import json
import math
import os
import subprocess
import time

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter, fftconvolve

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = os.path.join(ROOT, "docs", "compliance", "sources-audio", "xieqiqu-music-v3")
OUT_DIR = os.path.join(DST, "synth")

SR = 44100
TARGET_SECONDS = 30.0
GEN_SECONDS = 32.0
FADE_IN = 0.5
FADE_OUT = 1.8
LOUDNORM = "loudnorm=I=-16:TP=-1.5:LRA=11"

# ---------------------------------------------------------------- 音色合成


def midi_freq(midi):
    return 440.0 * (2.0 ** ((midi - 69) / 12.0))


def adsr(n, attack, decay, sustain, release):
    env = np.zeros(n, dtype=np.float64)
    a = max(1, int(attack * SR))
    d = max(1, int(decay * SR))
    r = max(1, int(release * SR))
    s = max(0, n - a - d - r)
    idx = 0
    env[idx:idx + a] = np.linspace(0.0, 1.0, a, endpoint=False)
    idx += a
    env[idx:idx + d] = np.linspace(1.0, sustain, d, endpoint=False)
    idx += d
    env[idx:idx + s] = sustain
    idx += s
    tail = n - idx
    if tail > 0:
        env[idx:] = np.linspace(sustain, 0.0, tail)
    return env


def pluck(freq, dur, vel=0.8, bright=0.55):
    """拨弦（琵琶/古筝）：加法合成 + 逐次谐波衰减 + 轻微不准律。"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    harmonics = 10
    for h in range(1, harmonics + 1):
        amp = (1.0 / (h ** (1.9 - bright))) * (0.85 ** (h - 1))
        decay = np.exp(-t * (2.2 + 0.9 * h))
        inh = 1.0 + 0.0004 * (h * h)          # 轻微不准律，更像真弦
        out += amp * decay * np.sin(2 * np.pi * freq * h * inh * t + h * 0.7)
    # 弹拨瞬态
    burst = int(0.006 * SR)
    noise = np.random.default_rng(int(freq) % 9973).normal(0, 1, burst)
    out[:burst] += 0.12 * noise * np.linspace(1.0, 0.0, burst)
    out *= adsr(n, 0.002, 0.02, 0.85, min(0.25, dur * 0.4))
    return out * vel


def bowed(freq, dur, vel=0.7, detune=0.006, attack=0.22, release=0.5):
    """擦弦（小提琴/大提琴组）：三路失谐锯齿 + 低通 + 延迟颤音。"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    vib = 1.0 + 0.004 * np.sin(2 * np.pi * 5.0 * np.maximum(t - 0.18, 0.0))
    out = np.zeros(n)
    for k, dt in enumerate((-detune, 0.0, detune)):
        phase = 2 * np.pi * freq * (1 + dt) * t * vib + k * 1.3
        # 锯齿：前 12 次谐波
        voice = np.zeros(n)
        for h in range(1, 13):
            voice += np.sin(phase * h) / h
        out += voice
    out /= 3.0
    b, a = butter(2, min(0.9, (freq * 4.5) / (SR / 2)), btype="low")
    out = lfilter(b, a, out)
    out *= adsr(n, attack, 0.08, 0.9, min(release, dur * 0.5))
    return out * vel


def flute(freq, dur, vel=0.7):
    """木管（西洋箫/长笛）：正弦主导 + 弱泛音 + 气声 + 延迟颤音。"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    vib = 1.0 + 0.005 * np.sin(2 * np.pi * 4.6 * np.maximum(t - 0.25, 0.0))
    phase = 2 * np.pi * freq * t * vib
    out = np.sin(phase) + 0.16 * np.sin(2 * phase) + 0.05 * np.sin(3 * phase)
    rng = np.random.default_rng(int(freq * 7) % 7919)
    noise = rng.normal(0, 1, n)
    b, a = butter(2, [1200 / (SR / 2), 5200 / (SR / 2)], btype="band")
    breath = lfilter(b, a, noise) * 0.09
    breath *= np.linspace(1.0, 0.55, n)
    out = out + breath
    out *= adsr(n, 0.12, 0.06, 0.92, min(0.35, dur * 0.5))
    return out * vel


def pad(freq, dur, vel=0.5):
    """垫底弦乐：双八度正弦 + 慢包络，只做和声床。"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = (np.sin(2 * np.pi * freq * t) * 0.6
           + np.sin(2 * np.pi * freq * 2 * t) * 0.18
           + np.sin(2 * np.pi * freq * 0.5 * t) * 0.35)
    out *= adsr(n, min(0.6, dur * 0.35), 0.2, 0.85, min(0.9, dur * 0.5))
    return out * vel


def chime(freq, dur, vel=0.5):
    """收束用的轻钟/磬。"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = (np.sin(2 * np.pi * freq * t) * np.exp(-t * 2.2)
           + 0.4 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 3.4)
           + 0.2 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t * 5.0))
    return out * vel


VOICES = {"pluck": pluck, "bowed": bowed, "flute": flute, "pad": pad, "chime": chime}

# ---------------------------------------------------------------- 曲谱

# (voice, start_beat, dur_beats, midi, velocity)；midi 60=C4
SCORES = {
    # b1 月下谐奇趣：D 小调慢板，琵琶起句 → 木管主题 → 琵琶应答 → 全奏收束
    "b1": {
        "title": "月下谐奇趣（慢板合奏）",
        "bpm": 76, "swing": 0.0,
        "pan": {"pluck": -0.28, "flute": 0.16, "bowed": 0.0,
                "pad": 0.0, "chime": 0.3},
        "notes": (
            # 前奏：古筝式琶音 + 垫底
            [("pluck", 0, 1, 50, 0.55), ("pluck", 1, 1, 57, 0.5), ("pluck", 2, 1, 62, 0.55),
             ("pluck", 3, 1, 65, 0.5), ("pluck", 4, 1, 69, 0.6), ("pluck", 5, 1, 74, 0.5),
             ("pad", 0, 8, 38, 0.32), ("pad", 0, 8, 45, 0.28), ("pad", 4, 4, 53, 0.22),
             ("bowed", 2, 6, 57, 0.34), ("bowed", 2, 6, 62, 0.3)],
            # 主题：木管
            [("bowed", 8, 8, 50, 0.36), ("bowed", 8, 8, 57, 0.32), ("bowed", 8, 8, 65, 0.26),
             ("flute", 8, 2, 69, 0.72), ("flute", 10, 1, 72, 0.68), ("flute", 11, 1, 74, 0.72),
             ("flute", 12, 2, 72, 0.7), ("flute", 14, 2, 69, 0.66),
             ("flute", 16, 2, 67, 0.68), ("flute", 18, 1, 65, 0.64), ("flute", 19, 1, 67, 0.66),
             ("flute", 20, 4, 69, 0.72),
             ("pluck", 9, 1, 45, 0.32), ("pluck", 13, 1, 53, 0.32), ("pluck", 17, 1, 43, 0.32),
             ("pluck", 21, 1, 45, 0.32),
             ("pad", 16, 8, 55, 0.2)],
            # 应答：琵琶走句
            [("bowed", 24, 8, 45, 0.34), ("bowed", 24, 8, 57, 0.28), ("bowed", 24, 8, 62, 0.24),
             ("pluck", 24, 0.5, 74, 0.7), ("pluck", 24.5, 0.5, 72, 0.62),
             ("pluck", 25, 1, 69, 0.66), ("pluck", 26, 1, 67, 0.6), ("pluck", 27, 1, 65, 0.62),
             ("pluck", 28, 1, 62, 0.6), ("pluck", 29, 1, 65, 0.56),
             ("pluck", 30, 0.5, 67, 0.58), ("pluck", 30.5, 0.5, 69, 0.6),
             ("flute", 28, 4, 62, 0.42)],
            # 收束：全奏 D 小调
            [("bowed", 32, 8, 50, 0.42), ("bowed", 32, 8, 57, 0.36), ("bowed", 32, 8, 65, 0.3),
             ("pad", 32, 8, 38, 0.3), ("pad", 32, 8, 57, 0.22),
             ("flute", 32, 6, 74, 0.7), ("flute", 38, 2, 69, 0.5),
             ("pluck", 32, 1, 62, 0.55), ("pluck", 33, 1, 69, 0.5), ("pluck", 34, 1, 74, 0.55),
             ("pluck", 35, 1, 77, 0.45),
             ("chime", 34, 4, 81, 0.4), ("chime", 36, 4, 86, 0.28),
             ("pluck", 36, 4, 74, 0.5), ("pluck", 36, 4, 62, 0.45)]),
    },
    # b2 宫廷轻舞：F 大调五声轻快，琵琶+扬琴颗粒 + 弦乐拨奏感
    "b2": {
        "title": "宫廷轻舞（轻快合奏）",
        "bpm": 104, "swing": 0.0,
        "pan": {"pluck": -0.3, "flute": 0.22, "bowed": 0.05, "pad": -0.1, "chime": 0.32},
        "notes": (
            [("pluck", 0, 1, 53, 0.6), ("pluck", 1, 1, 60, 0.5), ("pluck", 2, 1, 65, 0.55),
             ("pluck", 3, 1, 69, 0.5), ("pluck", 4, 1, 72, 0.6), ("pluck", 5, 1, 69, 0.5),
             ("pluck", 6, 1, 65, 0.55), ("pluck", 7, 1, 60, 0.5),
             ("pad", 0, 8, 41, 0.24), ("pad", 0, 8, 53, 0.2),
             ("bowed", 4, 4, 57, 0.3), ("bowed", 4, 4, 65, 0.26)],
            [("flute", 8, 1, 72, 0.7), ("flute", 9, 1, 74, 0.66), ("flute", 10, 1, 77, 0.72),
             ("flute", 11, 1, 74, 0.62), ("flute", 12, 2, 72, 0.68), ("flute", 14, 1, 69, 0.6),
             ("flute", 15, 1, 72, 0.64),
             ("pluck", 8, 1, 41, 0.42), ("pluck", 10, 1, 48, 0.4), ("pluck", 12, 1, 53, 0.42),
             ("pluck", 14, 1, 48, 0.4),
             ("bowed", 8, 8, 48, 0.3), ("bowed", 8, 8, 60, 0.24)],
            [("flute", 16, 1, 77, 0.7), ("flute", 17, 1, 76, 0.64), ("flute", 18, 1, 74, 0.66),
             ("flute", 19, 1, 72, 0.62), ("flute", 20, 1, 69, 0.64), ("flute", 21, 1, 72, 0.6),
             ("flute", 22, 2, 74, 0.68),
             ("pluck", 16, 1, 41, 0.42), ("pluck", 18, 1, 46, 0.4), ("pluck", 20, 1, 50, 0.42),
             ("pluck", 22, 1, 46, 0.4),
             ("bowed", 16, 8, 46, 0.3), ("bowed", 16, 8, 58, 0.24), ("pad", 16, 8, 58, 0.2)],
            [("flute", 24, 1, 72, 0.7), ("flute", 25, 1, 69, 0.62), ("flute", 26, 1, 65, 0.64),
             ("flute", 27, 1, 69, 0.6), ("flute", 28, 2, 72, 0.68), ("flute", 30, 2, 65, 0.56),
             ("pluck", 24, 0.5, 65, 0.55), ("pluck", 24.5, 0.5, 69, 0.5),
             ("pluck", 25, 0.5, 72, 0.55), ("pluck", 25.5, 0.5, 76, 0.5),
             ("pluck", 26, 1, 72, 0.55), ("pluck", 27, 1, 69, 0.5),
             ("pluck", 28, 1, 65, 0.55), ("pluck", 29, 1, 60, 0.5),
             ("bowed", 24, 8, 53, 0.32), ("bowed", 24, 8, 65, 0.26),
             ("pad", 24, 8, 41, 0.24),
             ("chime", 30, 2, 84, 0.34), ("chime", 32, 6, 77, 0.3),
             ("pluck", 32, 6, 53, 0.5), ("pluck", 32, 6, 65, 0.45),
             ("bowed", 32, 6, 53, 0.34), ("bowed", 32, 6, 60, 0.28)]),
    },
    # b3 静夜：A 小调五声超慢板，箫独白 + 弦乐垫 + 古筝点
    "b3": {
        "title": "静夜（箫与弦）",
        "bpm": 62, "swing": 0.0,
        "pan": {"pluck": 0.26, "flute": -0.12, "bowed": 0.0, "pad": 0.08, "chime": -0.3},
        "notes": (
            [("pad", 0, 10, 45, 0.3), ("pad", 0, 10, 52, 0.26), ("pad", 0, 10, 57, 0.2),
             ("bowed", 2, 8, 57, 0.28), ("bowed", 2, 8, 64, 0.22),
             ("flute", 3, 4, 69, 0.6), ("flute", 7, 3, 72, 0.56),
             ("pluck", 8, 1, 69, 0.34), ("pluck", 9, 1, 64, 0.3)],
            [("pad", 10, 10, 41, 0.3), ("pad", 10, 10, 53, 0.24),
             ("bowed", 10, 10, 53, 0.28), ("bowed", 10, 10, 60, 0.22),
             ("flute", 11, 3, 74, 0.58), ("flute", 14, 2, 72, 0.54), ("flute", 16, 4, 69, 0.6),
             ("pluck", 15, 1, 60, 0.3), ("pluck", 18, 1, 57, 0.3), ("pluck", 19, 1, 60, 0.28)],
            [("pad", 20, 10, 38, 0.32), ("pad", 20, 10, 50, 0.26),
             ("bowed", 20, 10, 50, 0.3), ("bowed", 20, 10, 57, 0.24),
             ("flute", 21, 4, 76, 0.58), ("flute", 25, 3, 74, 0.54),
             ("flute", 28, 2, 72, 0.5),
             ("pluck", 23, 1, 57, 0.3), ("pluck", 26, 1, 53, 0.28), ("pluck", 27, 1, 57, 0.26)],
            [("pad", 30, 12, 45, 0.34), ("pad", 30, 12, 57, 0.28), ("pad", 30, 12, 64, 0.2),
             ("bowed", 30, 12, 57, 0.32), ("bowed", 30, 12, 69, 0.24),
             ("flute", 31, 6, 69, 0.58), ("flute", 37, 5, 64, 0.5),
             ("pluck", 32, 1, 57, 0.32), ("pluck", 33, 1, 64, 0.28),
             ("pluck", 36, 1, 69, 0.3), ("pluck", 38, 1, 64, 0.26),
             ("chime", 34, 8, 81, 0.26)]),
    },
}

REVERB = {"b1": 0.30, "b2": 0.20, "b3": 0.36}

# ---------------------------------------------------------------- 渲染


def make_reverb_ir(seconds=1.7, decay=4.2, seed=7):
    n = int(seconds * SR)
    rng = np.random.default_rng(seed)
    t = np.arange(n) / SR
    env = np.exp(-t * decay)
    ir_l = rng.normal(0, 1, n) * env
    ir_r = rng.normal(0, 1, n) * env
    # 高频吸收
    b, a = butter(2, 4200 / (SR / 2), btype="low")
    return lfilter(b, a, ir_l), lfilter(b, a, ir_r)


def render(piece_key):
    spec = SCORES[piece_key]
    bpm = spec["bpm"]
    spb = 60.0 / bpm
    total = int(GEN_SECONDS * SR)
    stems = {name: np.zeros(total) for name in VOICES}

    for bar in spec["notes"]:
        for (voice, beat, dur_beats, midi, vel) in bar:
            start = beat * spb
            dur = dur_beats * spb * 1.06          # 稍留余量，让自然衰减
            n = int(dur * SR)
            i0 = int(start * SR)
            if i0 >= total:
                continue
            n = min(n, total - i0)
            tone = VOICES[voice](midi_freq(midi), dur, vel)[:n]
            stems[voice][i0:i0 + n] += tone

    # 立体声 + 混响
    ir_l, ir_r = make_reverb_ir()
    mix_l = np.zeros(total)
    mix_r = np.zeros(total)
    for name, sig in stems.items():
        pan = spec["pan"].get(name, 0.0)          # -1 全左，+1 全右
        gl = math.cos((pan + 1) * math.pi / 4)
        gr = math.sin((pan + 1) * math.pi / 4)
        mix_l += sig * gl
        mix_r += sig * gr

    wet = REVERB.get(piece_key, 0.25)
    rev_l = fftconvolve(mix_l, ir_l)[:total] * wet * 0.14
    rev_r = fftconvolve(mix_r, ir_r)[:total] * wet * 0.14
    mix_l = mix_l + rev_l
    mix_r = mix_r + rev_r

    # 母带前处理：软削波 + 峰值留头
    stereo = np.stack([mix_l, mix_r], axis=1)
    peak = np.max(np.abs(stereo)) or 1.0
    stereo = stereo / peak * 0.92
    stereo = np.tanh(stereo * 1.15) / math.tanh(1.15)
    stereo = stereo / (np.max(np.abs(stereo)) or 1.0) * 0.89

    name = "xq3-synth-" + piece_key
    wav_path = os.path.join(OUT_DIR, name + ".wav")
    os.makedirs(OUT_DIR, exist_ok=True)
    wavfile.write(wav_path, SR, (stereo * 32767).astype(np.int16))
    return name, wav_path, spec


def postprocess(wav_path, mp3_path):
    fade_out_start = TARGET_SECONDS - FADE_OUT
    filters = "%s,afade=t=in:st=0:d=%.2f,afade=t=out:st=%.2f:d=%.2f" % (
        LOUDNORM, FADE_IN, fade_out_start, FADE_OUT)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path,
         "-af", filters, "-t", "%.2f" % TARGET_SECONDS,
         "-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "192k", mp3_path],
        check=True)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def manifest_path():
    return os.path.join(OUT_DIR, "manifest.json")


def manifest_load():
    try:
        with open(manifest_path(), "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"pipeline": "程序化作曲与合成（无音频模型）",
                "engine": {"sr": SR, "voices": sorted(VOICES), "target_seconds": TARGET_SECONDS,
                           "fade_in": FADE_IN, "fade_out": FADE_OUT, "loudnorm": LOUDNORM},
                "pieces": []}


def manifest_append(entry):
    data = manifest_load()
    data["pieces"] = [p for p in data["pieces"] if p["name"] != entry["name"]] + [entry]
    with open(manifest_path(), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def make_one(piece_key):
    name, wav_path, spec = render(piece_key)
    mp3_path = os.path.join(OUT_DIR, name + ".mp3")
    postprocess(wav_path, mp3_path)
    entry = {
        "name": name,
        "piece": piece_key,
        "title": spec["title"],
        "bpm": spec["bpm"],
        "file": os.path.relpath(mp3_path, ROOT).replace("\\", "/"),
        "bytes": os.path.getsize(mp3_path),
        "sha256": sha256_file(mp3_path),
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    manifest_append(entry)
    print("[synth %s] %s -> %s" % (piece_key, spec["title"], entry["file"]), flush=True)
    return entry


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--piece", choices=sorted(SCORES))
    a = ap.parse_args()
    keys = sorted(SCORES) if a.all or not a.piece else [a.piece]
    for key in keys:
        make_one(key)


if __name__ == "__main__":
    main()
