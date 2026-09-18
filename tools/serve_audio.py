# -*- coding: utf-8 -*-
"""本地静态服务：供小程序开发工具/真机预览播放 TTS 语音与 BGM。

用法（仓库根目录）:
  python tools/serve_audio.py            # 默认 127.0.0.1:8787，文档根=仓库根
  python tools/serve_audio.py --port 9000
  python tools/serve_audio.py --host 0.0.0.0   # 真机预览：手机经局域网 IP 访问

URL 形态（与 plate21/module/utils/audio-src.js 的 AUDIO_BASE 对齐）:
  http://127.0.0.1:8787/audio/v22/dlg-haiyantang-1.mp3   # V2.2 语音
  http://127.0.0.1:8787/bgm/bgm-07x-xieqiqu-dual.mp3     # BGM

真机：手机与开发机同网，把 utils/audio-src.js 的 AUDIO_BASE 换成
http://<开发机局域网IP>:8787/audio/v22（生产换 CDN，同样只改这一处）。
"""
import argparse
import functools
import http.server
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class AudioHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):  # noqa: A003 - 安静模式
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8787)
    args = ap.parse_args()
    handler = functools.partial(AudioHandler)
    with http.server.ThreadingHTTPServer((args.host, args.port), handler) as srv:
        print(f"serving {ROOT} at http://{args.host}:{args.port} "
              f"(audio at /audio/v22, bgm at /bgm)")
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
