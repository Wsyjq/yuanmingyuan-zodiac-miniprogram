# -*- coding: utf-8 -*-
"""manifest 反向同步：页面（文字稿）= 唯一事实源，重写 voice_manifest 的文本。

- dlg-*：从页面台词块（waypoint.js SITES / 各页 wxml dialogue-block）提取
- narr-*：按页规则提取旁白字符串（叙事类节点/JS 叙事常量），维持阅读顺序
- 其余字段（cast/speaker/voices）不动；同步后跑 tools/audit_voice_sync.py 应归零
"""
import io, json, re, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = os.path.join(ROOT, 'plate21', 'module', 'pages')
MAN = os.path.join(ROOT, 'tools', 'voice_manifest.json')

def read(p):
    return io.open(p, encoding='utf-8').read()

# ---------- 台词提取（与审计同源） ----------
def extract_dialogues():
    out = {}
    wp = read(os.path.join(PAGES, 'waypoint', 'waypoint.js'))
    for m in re.finditer(r"\{\s*speaker:\s*'([^']+)',(?:\s*aside:\s*'([^']+)',)?\s*text:\s*'([^']+)',\s*clipId:\s*'([^']+)'", wp):
        out[m.group(4)] = [m.group(3)]
    for dirpath, _, files in os.walk(PAGES):
        for f in files:
            if not f.endswith('.wxml'):
                continue
            s = read(os.path.join(dirpath, f))
            for m in re.finditer(r'<dialogue-block([^>]*?)/>', s, re.S):
                t = re.search(r'text="([^"]*)"', m.group(1))
                c = re.search(r'clip-id="([^"]*)"', m.group(1))
                if t and c and '{{' not in t.group(1):
                    out[c.group(1)] = [t.group(1)]
    return out

# ---------- wxml 叙事文本提取 ----------
def wxml_texts(page, class_re):
    s = read(os.path.join(PAGES, page, page + '.wxml'))
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    texts = []
    for m in re.finditer(r'<view[^>]*class="([^"]*)"[^>]*>([^<]*)</view>', s):
        if re.search(class_re, m.group(1)):
            t = m.group(2).strip()
            if t and '{{' not in t:
                texts.append(t)
    return texts

# ---------- JS 叙事常量提取 ----------
def js_text_fields(page):  # prologue/finale 的 [{text:'…'}] 数组
    s = read(os.path.join(PAGES, page, page + '.js'))
    return re.findall(r"text: '((?:[^'\\]|\\.)*)'", s)

def js_str_array(page, name):
    s = read(os.path.join(PAGES, page, page + '.js'))
    m = re.search(r'const %s = \[((?:.|\n)*?)\]\s*\n' % name, s)
    if not m:
        return []
    return re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(1))

def js_const_str(page, name):
    s = read(os.path.join(PAGES, page, page + '.js'))
    m = re.search(r"const %s = '((?:[^'\\]|\\.)*)'" % name, s)
    return [m.group(1)] if m else []

# ---------- waypoint 叙事（intro + 各 beat 的 lines/quotes） ----------
def waypoint_narr(site_key):
    s = read(os.path.join(PAGES, 'waypoint', 'waypoint.js'))
    seg = re.search(r'\n  %s: \{(.|\n)*?\n  \}' % re.escape(site_key), s)
    if not seg:
        return []
    body = seg.group(0)
    texts = []
    m = re.search(r"intro: '((?:[^'\\]|\\.)*)'", body)
    if m:
        texts.append(m.group(1))
    for block in re.finditer(r"(lines|quotes): \[((?:.|\n)*?)\]", body):
        for t in re.findall(r"'((?:[^'\\]|\\.)*)'", block.group(2)):
            texts.append(t)
    return texts

# 旁白已按屏拆条，由 tools/build_page_voice.js 维护。这里只保留仍单条的页，
# 避免把旧的「整路由一条」规则写回 manifest。
NARR_RULES = {
    'narr-s2-blend': lambda: wxml_texts('s2-blend', r'lead kaiti'),
    'narr-s2-quiz': lambda: wxml_texts('s2-quiz', r'novel-p')[:1],
    'narr-s2-reveal': lambda: wxml_texts('s2-reveal', r'lead kaiti'),
    'narr-s2-pattern': lambda: wxml_texts('s2-pattern', r'lead kaiti'),
    'narr-s3-zodiac': lambda: wxml_texts('s3-zodiac', r'lead kaiti'),
    'narr-s3-water': lambda: wxml_texts('s3-water', r'lead kaiti'),
    'narr-s4-password': lambda: wxml_texts('s4-password', r'lead kaiti'),
    'narr-waypoint-xieqiqu': lambda: [waypoint_narr('xieqiqu')[0]] if waypoint_narr('xieqiqu') else [],
    'narr-waypoint-fangwaiguan': lambda: [waypoint_narr('fangwaiguan')[0]] if waypoint_narr('fangwaiguan') else [],
    'narr-waypoint-xushuilou': lambda: [waypoint_narr('xushuilou')[0]] if waypoint_narr('xushuilou') else [],
    'narr-waypoint-yangquelong': lambda: [waypoint_narr('yangquelong')[0]] if waypoint_narr('yangquelong') else [],
    'narr-waypoint-guanshuifa': lambda: [waypoint_narr('guanshuifa')[0]] if waypoint_narr('guanshuifa') else [],
    'narr-waypoint-xianfahua': lambda: [waypoint_narr('xianfahua')[0]] if waypoint_narr('xianfahua') else [],
}

def main():
    man = json.load(io.open(MAN, encoding='utf-8'))
    dlg = extract_dialogues()
    changed = 0
    for clip in man['clips']:
        cid = clip['id']
        if cid.startswith('dlg-') and cid in dlg:
            if clip['text'] != dlg[cid]:
                clip['text'] = dlg[cid]
                changed += 1
        if cid.startswith('narr-') and cid in NARR_RULES:
            texts = NARR_RULES[cid]()
            if not texts:
                print('!! %s 提取为空，跳过' % cid)
                continue
            new = texts if len(texts) > 1 else texts[0]
            if clip['text'] != new:
                clip['text'] = new
                changed += 1
    json.dump(man, io.open(MAN, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('synced clips: %d（文本已对齐页面）' % changed)

if __name__ == '__main__':
    main()
