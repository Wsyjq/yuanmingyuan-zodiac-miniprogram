# -*- coding: utf-8 -*-
"""按分页方案生成主线旁白。语气见 tools/narr_voice_prompt.json。不打印密钥。"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_voice

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "audio", "mainline")
PROMPT = os.path.join(HERE, "narr_voice_prompt.json")
TEXTS = os.path.join(HERE, "narr_mainline.json")


def speak(paragraphs):
    return "<#0.45#>".join(p.strip() for p in paragraphs if p and p.strip())


def synth(clip, voice, pronunciation):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, clip["id"] + ".mp3")
    cast = {
        "mm_voice": voice["voice_id"],
        "mm_speed": voice["speed"],
        "mm_pitch": voice["pitch"],
    }
    body_text = speak(clip["paragraphs"])
    # 复用 gen_voice 的请求，补上情绪和读音。提示词本身不送进接口，
    # speech-02-hd 用 emotion / speed / pitch 落地这份语气。
    saved = gen_voice.synth_minimax
    def wrapped(text, cast_arg, out_path):
        body = {
            "model": os.environ.get("MINIMAX_MODEL", "speech-02-hd"),
            "text": text,
            "stream": False,
            "voice_setting": {
                "voice_id": cast_arg["mm_voice"],
                "speed": float(cast_arg["mm_speed"]),
                "vol": 1.0,
                "pitch": int(cast_arg["mm_pitch"]),
                "emotion": voice["emotion"],
            },
            "pronunciation_dict": {"tone": pronunciation},
            "audio_setting": {
                "sample_rate": 32000,
                "bitrate": 128000,
                "format": "mp3",
                "channel": 1,
            },
        }
        resp = gen_voice.minimax_post("/v1/t2a_v2", body)
        code = resp.get("base_resp", {}).get("status_code", 0)
        if code != 0:
            raise RuntimeError("minimax %s: %s" % (code, resp.get("base_resp", {}).get("status_msg")))
        audio = resp["data"]["audio"]
        try:
            raw = bytes.fromhex(audio)
        except ValueError:
            import base64
            raw = base64.b64decode(audio)
        with open(out_path, "wb") as f:
            f.write(raw)
        return resp.get("extra_info", {}).get("audio_length", 0) / 1000.0
    gen_voice.synth_minimax = wrapped
    try:
        seconds = gen_voice.synth_minimax(body_text, cast, path)
    finally:
        gen_voice.synth_minimax = saved
    return seconds, os.path.getsize(path)


def main():
    only = sys.argv[1:]
    gen_voice.load_dotenv()
    prompt = json.load(open(PROMPT, encoding="utf-8"))
    clips = json.load(open(TEXTS, encoding="utf-8"))
    os.environ.setdefault("MINIMAX_MODEL", prompt["model"])
    done = 0
    for clip in clips:
        if only and clip["id"] not in only:
            continue
        voice = prompt[clip.get("cast", "narrator")]
        try:
            seconds, size = synth(clip, voice, prompt["pronunciation"])
        except Exception as exc:
            print("FAIL", clip["id"], exc)
            return 1
        print("OK", clip["id"], "%.1fs" % seconds, size)
        done += 1
    print("count", done)
    return 0


if __name__ == "__main__":
    sys.exit(main())
