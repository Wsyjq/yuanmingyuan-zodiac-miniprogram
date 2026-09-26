# -*- coding: utf-8 -*-
"""谐奇趣 DJ-06 声景 v3 候选试听对比页生成器。

汇总三条产线的候选：
  1. Music3 本地整段合奏   docs/compliance/sources-audio/xieqiqu-music-v3/candidates/
  2. 程序化作曲与合成      docs/compliance/sources-audio/xieqiqu-music-v3/synth/
  3. 参照：现役 v2 声景     voice-a/dj06-xieqiqu-soundscape-30s-v2.mp3

用法（仓库根目录）:
  python tools/build_xieqiqu_music_review.py

输出: docs/compliance/sources-audio/xieqiqu-music-v3/review.html
页面不联网、不写仓库文件；评分与备注存在浏览器 localStorage，可一键导出。
音频未由生成方试听，好坏以听者判断为准。
"""
from __future__ import print_function

import hashlib
import json
import os
import struct
import subprocess
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = os.path.join(ROOT, "docs", "compliance", "sources-audio", "xieqiqu-music-v3")
OUT_HTML = os.path.join(BASE_DIR, "review.html")
REFERENCE = "voice-a/dj06-xieqiqu-soundscape-30s-v2.mp3"
PEAK_BUCKETS = 320


def probe(path):
    p = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "format=duration,bit_rate", "-of", "json", path],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    info = json.loads(p.stdout.decode() or "{}").get("format", {})
    return {
        "duration": round(float(info.get("duration", 0)), 2),
        "kbps": int(round(int(info.get("bit_rate", 0)) / 1000.0)),
    }


def peaks(path, buckets=PEAK_BUCKETS):
    p = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "8000",
         "-f", "s16le", "-"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    raw = p.stdout
    n = len(raw) // 2
    if n == 0:
        return []
    samples = struct.unpack("<%dh" % n, raw[:n * 2])
    step = max(1, n // buckets)
    out = []
    for i in range(0, n, step):
        chunk = samples[i:i + step]
        out.append(round(max(abs(v) for v in chunk) / 32768.0, 3))
    return out


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def collect():
    items = []

    cand_manifest = os.path.join(BASE_DIR, "candidates", "manifest.json")
    if os.path.exists(cand_manifest):
        data = json.load(open(cand_manifest, encoding="utf-8"))
        for c in data.get("candidates", []):
            abs_path = os.path.join(ROOT, c["file"].replace("/", os.sep))
            if not os.path.exists(abs_path):
                continue
            meta = probe(abs_path)
            gen = round(float(c.get("generated_seconds", 0) or 0), 1)
            short = 0 < gen < 29
            items.append({
                "id": c["name"],
                "title": "Music3「%s」seed %s" % (c["variant"], c["seed"]),
                "pipeline": "music3",
                "pipelineLabel": "Music3 本地整段合奏",
                "short": short,
                "detail": "变体 %s · 种子 %s · 模型出曲 %.1fs · 耗时 %s%s" % (
                    c["variant"], c["seed"], gen,
                    ("%ss" % c["elapsed_seconds"]) if c.get("elapsed_seconds") else "—",
                    ("（尾部静音约 %.1fs）" % (30.0 - gen)) if short else ""),
                "caption": c.get("caption", ""),
                "src": c["file"],
                "peaks": peaks(abs_path),
                "meta": meta,
                "sha256": c.get("sha256", ""),
            })

    synth_manifest = os.path.join(BASE_DIR, "synth", "manifest.json")
    if os.path.exists(synth_manifest):
        data = json.load(open(synth_manifest, encoding="utf-8"))
        for s in data.get("pieces", []):
            abs_path = os.path.join(ROOT, s["file"].replace("/", os.sep))
            if not os.path.exists(abs_path):
                continue
            meta = probe(abs_path)
            items.append({
                "id": s["name"],
                "title": "程序合成「%s」" % s["title"],
                "pipeline": "synth",
                "pipelineLabel": "程序化作曲与合成（无音频模型）",
                "short": False,
                "detail": "BPM %s · 拨弦加法合成 / 擦弦锯齿 / 木管正弦+气声 · 合成混响" % s["bpm"],
                "caption": "曲谱与音色全部由 tools/synth_xieqiqu_music.py 写死，可复现、零版权风险。",
                "src": s["file"],
                "peaks": peaks(abs_path),
                "meta": meta,
                "sha256": s.get("sha256", ""),
            })

    ref_abs = os.path.join(ROOT, REFERENCE.replace("/", os.sep))
    if os.path.exists(ref_abs):
        meta = probe(ref_abs)
        items.append({
            "id": "ref-v2",
            "title": "参照：现役 v2 声景（辨认版）",
            "pipeline": "ref",
            "pipelineLabel": "现役参照（不参赛）",
            "short": False,
            "detail": "琵琶 0.8s → 小拉琴 6.8s → 西洋箫 12.8s 依次进场，为“听音辨认乐器”设计",
            "caption": "当前发布包里的声音，放这里做 A/B 对比。",
            "src": REFERENCE.replace("\\", "/"),
            "peaks": peaks(ref_abs),
            "meta": meta,
            "sha256": sha256_file(ref_abs),
        })
    return items


TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>谐奇趣声景 v3 · 候选试听对比</title>
<style>
  :root {
    --paper: #f6f1e6; --card: #fffdf7; --ink: #2b2118; --soft: #7a6a56;
    --line: #e2d6c1; --accent: #8b3a2b; --gold: #b98a2f;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px 16px 64px; background: var(--paper); color: var(--ink);
    font: 15px/1.7 "Noto Serif SC", "Songti SC", "SimSun", serif;
  }
  .wrap { max-width: 860px; margin: 0 auto; }
  h1 { font-size: 24px; margin: 0 0 6px; letter-spacing: 1px; }
  .sub { color: var(--soft); margin: 0 0 18px; font-size: 14px; }
  .notice {
    background: #fdf6e6; border: 1px solid var(--line); border-left: 4px solid var(--gold);
    padding: 12px 16px; border-radius: 6px; font-size: 13.5px; color: var(--soft); margin-bottom: 22px;
  }
  .toolbar {
    display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 18px;
    position: sticky; top: 0; background: var(--paper); padding: 10px 0; z-index: 5;
    border-bottom: 1px solid var(--line);
  }
  .chip {
    border: 1px solid var(--line); background: var(--card); color: var(--ink);
    padding: 5px 14px; border-radius: 999px; cursor: pointer; font-size: 13px;
  }
  .chip.on { background: var(--accent); border-color: var(--accent); color: #fff; }
  .spacer { flex: 1; }
  .btn {
    border: 1px solid var(--accent); background: var(--accent); color: #fff;
    padding: 7px 16px; border-radius: 6px; cursor: pointer; font-size: 13.5px;
  }
  .btn.ghost { background: transparent; color: var(--accent); }
  .card {
    background: var(--card); border: 1px solid var(--line); border-radius: 10px;
    padding: 18px 20px; margin-bottom: 18px;
  }
  .card.hidden { display: none; }
  .card-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .title { font-size: 17px; font-weight: 700; }
  .tag {
    font-size: 11.5px; padding: 2px 9px; border-radius: 999px;
    background: #efe4cd; color: #6b4f3a; letter-spacing: .5px;
  }
  .tag.synth { background: #dce8dc; color: #37553c; }
  .tag.ref { background: #e6e0ef; color: #574a70; }
  .detail { color: var(--soft); font-size: 13px; margin: 6px 0 12px; }
  .wave {
    width: 100%; height: 68px; display: block; cursor: pointer;
    background: #f2ead9; border-radius: 6px;
  }
  .wave rect { fill: #c9b394; }
  .wave rect.played { fill: var(--accent); }
  audio { width: 100%; margin: 12px 0 6px; }
  .rowline { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 8px; }
  .stars { font-size: 22px; letter-spacing: 3px; cursor: pointer; color: #d8c9ac; user-select: none; }
  .stars .lit { color: var(--gold); }
  .seen { font-size: 12px; color: var(--soft); }
  .seen b { color: var(--accent); }
  .pick { display: flex; align-items: center; gap: 6px; font-size: 13.5px; cursor: pointer; }
  textarea {
    width: 100%; margin-top: 10px; min-height: 58px; resize: vertical;
    border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px;
    font: 13.5px/1.6 inherit; background: #fffef9; color: var(--ink);
  }
  .caption { font-size: 12.5px; color: var(--soft); margin-top: 8px; }
  .export {
    position: fixed; right: 18px; bottom: 18px; display: flex; gap: 10px;
    background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 10px;
    box-shadow: 0 6px 22px rgba(80, 56, 24, .16);
  }
  .toast {
    position: fixed; left: 50%; bottom: 84px; transform: translateX(-50%);
    background: var(--ink); color: #fff; padding: 8px 18px; border-radius: 999px;
    font-size: 13px; opacity: 0; transition: opacity .25s; pointer-events: none;
  }
  .toast.show { opacity: .95; }
  .empty { color: var(--soft); padding: 30px 0; text-align: center; display: none; }
  footer { color: var(--soft); font-size: 12.5px; margin-top: 30px; line-height: 1.9; }
  code { background: #efe7d6; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>谐奇趣声景 v3 · 候选试听对比</h1>
  <p class="sub">生成时间 __GENERATED__ · 全部候选同一条母带链（30 秒 / 192 kbps / -16 LUFS / 淡入 0.5s / 淡出 1.8s），可公平比较</p>

  <div class="notice">
    本页只做技术汇总，<b>音频未由生成方试听</b>，不构成听审结论。请以你自己的耳朵为准；
    点星打分、写备注、勾“入围”，最后用右下角<b>导出选择</b>把结果发回即可。
    评分与备注只存在你浏览器本地（localStorage），不写入仓库。
  </div>

  <div class="toolbar">
    <button class="chip on" data-filter="all">全部 __COUNT_ALL__</button>
    <button class="chip" data-filter="music3">Music3 本地 __COUNT_MUSIC3__</button>
    <button class="chip" data-filter="synth">程序合成 __COUNT_SYNTH__</button>
    <button class="chip" data-filter="ref">现役参照 __COUNT_REF__</button>
    <span class="spacer"></span>
    <button class="chip" id="sortToggle" data-sort="pipeline">排序：产线</button>
    <button class="chip" id="onlyPicked">只看入围</button>
  </div>

  <div id="list"></div>
  <div class="empty" id="empty">没有符合条件的候选。</div>

  <footer>
    生成产线与可复现记录：<br>
    ① Music3：<code>tools/gen_xieqiqu_music3.py</code>（本地 ComfyUI MiniMax Music3，提示词/种子/SHA 见
    <code>candidates/manifest.json</code>）<br>
    ② 程序合成：<code>tools/synth_xieqiqu_music.py</code>（曲谱与音色写死，<code>synth/manifest.json</code>）<br>
    ③ 参照：现役发布音频 <code>voice-a/dj06-xieqiqu-soundscape-30s-v2.mp3</code><br>
    云端产线（Suno / 海绵音乐等）当前无可用凭据，未包含在本页；如需补入，把 MP3 放进 <code>candidates/</code>
    并在 <code>manifest.json</code> 登记后重跑本生成器即可。
  </footer>
</div>

<div class="export">
  <button class="btn ghost" id="copyBtn">导出选择（复制）</button>
  <button class="btn" id="downloadBtn">下载 JSON</button>
</div>
<div class="toast" id="toast"></div>

<script>
const ITEMS = __ITEMS__;
const STORE_KEY = "xq3-music-review-v1";

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (e) { return {}; }
}
function saveState(state) { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function stateOf(id) {
  const state = loadState();
  if (!state[id]) state[id] = { stars: 0, note: "", picked: false, heard: false };
  return state[id];
}
function updateState(id, patch) {
  const state = loadState();
  const cur = state[id] || { stars: 0, note: "", picked: false, heard: false };
  state[id] = Object.assign({}, cur, patch);
  saveState(state);
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(function () { el.classList.remove("show"); }, 1800);
}

function waveSvg(item, index) {
  const peaks = item.peaks || [];
  const w = 1000, h = 100;
  const step = w / Math.max(1, peaks.length);
  let bars = "";
  peaks.forEach(function (v, i) {
    const bh = Math.max(2, v * h);
    bars += '<rect x="' + (i * step).toFixed(2) + '" y="' + ((h - bh) / 2).toFixed(2) +
      '" width="' + Math.max(1, step * 0.72).toFixed(2) + '" height="' + bh.toFixed(2) +
      '" data-i="' + i + '"></rect>';
  });
  return '<svg class="wave" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" data-wave="' + index + '">' + bars + '</svg>';
}

function starHtml(stars) {
  let out = "";
  for (let i = 1; i <= 5; i++) out += '<span class="' + (i <= stars ? "lit" : "") + '">★</span>';
  return out;
}

function render() {
  const list = document.getElementById("list");
  list.innerHTML = ITEMS.map(function (item, index) {
    const st = stateOf(item.id);
    const tagClass = item.pipeline === "synth" ? "synth" : (item.pipeline === "ref" ? "ref" : "");
    return (
      '<div class="card" data-id="' + item.id + '" data-pipeline="' + item.pipeline + '" data-index="' + index + '">' +
        '<div class="card-head">' +
          '<span class="title">' + item.title + '</span>' +
          '<span class="tag ' + tagClass + '">' + item.pipelineLabel + '</span>' +
          (item.short ? '<span class="tag">出曲偏短</span>' : "") +
          (st.picked ? '<span class="tag">已入围</span>' : "") +
        '</div>' +
        '<div class="detail">' + item.detail + ' · ' + item.meta.duration + 's · ' + item.meta.kbps + 'kbps</div>' +
        waveSvg(item, index) +
        '<audio controls preload="none" src="' + item.src + '" data-audio="' + index + '"></audio>' +
        '<div class="rowline">' +
          '<span class="stars" data-stars="' + item.id + '">' + starHtml(st.stars) + '</span>' +
          '<label class="pick"><input type="checkbox" data-pick="' + item.id + '"' + (st.picked ? " checked" : "") + '> 入围候选</label>' +
          '<span class="seen" data-seen="' + item.id + '">' + (st.heard ? "已<b>试听</b>" : "未试听") + '</span>' +
        '</div>' +
        '<textarea data-note="' + item.id + '" placeholder="听感备注（例：开头很美但结尾收得急；想要更多琵琶…）">' + (st.note || "") + '</textarea>' +
        '<div class="caption">' + item.caption + '</div>' +
      '</div>'
    );
  }).join("");
  bind();
  applyFilters();
}

function bind() {
  document.querySelectorAll("audio[data-audio]").forEach(function (audio) {
    audio.addEventListener("play", function () {
      document.querySelectorAll("audio[data-audio]").forEach(function (other) {
        if (other !== audio) other.pause();
      });
      const card = audio.closest(".card");
      updateState(card.dataset.id, { heard: true });
      const seen = card.querySelector(".seen");
      if (seen) seen.innerHTML = "已<b>试听</b>";
    });
    audio.addEventListener("timeupdate", function () {
      const svg = document.querySelector('svg[data-wave="' + audio.dataset.audio + '"]');
      if (!svg) return;
      const ratio = audio.duration ? audio.currentTime / audio.duration : 0;
      const bars = svg.querySelectorAll("rect");
      const until = Math.floor(ratio * bars.length);
      bars.forEach(function (bar, i) { bar.classList.toggle("played", i < until); });
    });
  });
  document.querySelectorAll("svg[data-wave]").forEach(function (svg) {
    svg.addEventListener("click", function (ev) {
      const audio = document.querySelector('audio[data-audio="' + svg.dataset.wave + '"]');
      if (!audio || !audio.duration) return;
      const rect = svg.getBoundingClientRect();
      audio.currentTime = ((ev.clientX - rect.left) / rect.width) * audio.duration;
    });
  });
  document.querySelectorAll("[data-stars]").forEach(function (el) {
    el.addEventListener("click", function (ev) {
      const rect = el.getBoundingClientRect();
      const stars = Math.max(1, Math.min(5, Math.ceil(((ev.clientX - rect.left) / rect.width) * 5)));
      updateState(el.dataset.stars, { stars: stars });
      el.innerHTML = starHtml(stars);
    });
  });
  document.querySelectorAll("[data-note]").forEach(function (el) {
    el.addEventListener("input", function () { updateState(el.dataset.note, { note: el.value }); });
  });
  document.querySelectorAll("[data-pick]").forEach(function (el) {
    el.addEventListener("change", function () {
      updateState(el.dataset.pick, { picked: el.checked });
      const card = el.closest(".card");
      const head = card.querySelector(".card-head");
      const existing = head.querySelector(".tag:nth-of-type(2)");
      if (el.checked && !existing) {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = "已入围";
        head.appendChild(span);
      } else if (!el.checked && existing) existing.remove();
      if (onlyPicked) applyFilters();
    });
  });
}

let activeFilter = "all";
let onlyPicked = false;
let sortMode = "pipeline";

function applyFilters() {
  const cards = Array.from(document.querySelectorAll(".card"));
  cards.forEach(function (card) {
    const okFilter = activeFilter === "all" || card.dataset.pipeline === activeFilter;
    const st = stateOf(card.dataset.id);
    const okPick = !onlyPicked || st.picked;
    card.classList.toggle("hidden", !(okFilter && okPick));
  });
  const visible = cards.filter(function (c) { return !c.classList.contains("hidden"); });
  document.getElementById("empty").style.display = visible.length ? "none" : "block";

  const list = document.getElementById("list");
  visible.sort(function (a, b) {
    const ia = ITEMS[Number(a.dataset.index)], ib = ITEMS[Number(b.dataset.index)];
    if (sortMode === "stars") {
      const d = stateOf(ib.id).stars - stateOf(ia.id).stars;
      if (d) return d;
    }
    return ia.pipeline === ib.pipeline ? ia.id.localeCompare(ib.id) : ia.pipeline.localeCompare(ib.pipeline);
  }).forEach(function (card) { list.appendChild(card); });
}

function summary() {
  return ITEMS.map(function (item) {
    const st = stateOf(item.id);
    return {
      id: item.id, title: item.title, pipeline: item.pipelineLabel,
      src: item.src, sha256: item.sha256,
      stars: st.stars, picked: !!st.picked, heard: !!st.heard,
      note: st.note || "",
    };
  });
}

function summaryMarkdown() {
  const rows = summary().filter(function (r) { return r.picked || r.stars || r.note; });
  const lines = ["| 候选 | 产线 | 评分 | 入围 | 听感备注 |", "| --- | --- | --- | --- | --- |"];
  rows.forEach(function (r) {
    lines.push("| " + r.title + " | " + r.pipeline + " | " + "★".repeat(r.stars) +
      " | " + (r.picked ? "是" : "") + " | " + (r.note || "").replace(/\|/g, "／") + " |");
  });
  return lines.join("\\n") + "\\n";
}

document.getElementById("copyBtn").addEventListener("click", function () {
  const text = summaryMarkdown();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { toast("已复制到剪贴板"); },
      function () { window.prompt("手动复制：", text); });
  } else window.prompt("手动复制：", text);
});
document.getElementById("downloadBtn").addEventListener("click", function () {
  const blob = new Blob([JSON.stringify(summary(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "xq3-music-review-result.json";
  a.click();
  toast("已下载 JSON");
});

document.querySelectorAll("[data-filter]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll("[data-filter]").forEach(function (b) { b.classList.remove("on"); });
    btn.classList.add("on");
    activeFilter = btn.dataset.filter;
    applyFilters();
  });
});
document.getElementById("onlyPicked").addEventListener("click", function () {
  onlyPicked = !onlyPicked;
  this.classList.toggle("on", onlyPicked);
  applyFilters();
});
document.getElementById("sortToggle").addEventListener("click", function () {
  sortMode = sortMode === "pipeline" ? "stars" : "pipeline";
  this.textContent = "排序：" + (sortMode === "stars" ? "评分" : "产线");
  applyFilters();
});

render();
</script>
</body>
</html>
"""


def main():
    items = collect()
    if not items:
        raise SystemExit("没有候选可汇总，先运行 gen_xieqiqu_music3.py / synth_xieqiqu_music.py")

    html = (TEMPLATE
            .replace("__GENERATED__", time.strftime("%Y-%m-%d %H:%M"))
            .replace("__ITEMS__", json.dumps(items, ensure_ascii=False))
            .replace("__COUNT_ALL__", str(len(items)))
            .replace("__COUNT_MUSIC3__", str(sum(1 for i in items if i["pipeline"] == "music3")))
            .replace("__COUNT_SYNTH__", str(sum(1 for i in items if i["pipeline"] == "synth")))
            .replace("__COUNT_REF__", str(sum(1 for i in items if i["pipeline"] == "ref"))))

    os.makedirs(BASE_DIR, exist_ok=True)
    with open(OUT_HTML, "w", encoding="utf-8") as f:
        f.write(html)
    print("已生成 %s（%d 条：Music3 %d / 程序合成 %d / 参照 %d）" % (
        os.path.relpath(OUT_HTML, ROOT).replace("\\", "/"), len(items),
        sum(1 for i in items if i["pipeline"] == "music3"),
        sum(1 for i in items if i["pipeline"] == "synth"),
        sum(1 for i in items if i["pipeline"] == "ref")))


if __name__ == "__main__":
    main()
