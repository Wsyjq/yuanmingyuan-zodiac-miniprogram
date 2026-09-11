# -*- coding: utf-8 -*-
"""文字稿（页面）vs 音频稿（voice_manifest）一致性审计 v2。
- dlg-*：台词逐字比对（模板占位符 {{…}} 跳过）
- narr-*：旁白逐段比对——先把页面源码剥成纯文本（去标签/引号/逗号/空白），段落应整段命中；
  数字写法差异（1987 vs 一九八七）单独标记为 digit-style，不算不一致但列出。
"""
import io, json, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = os.path.join(ROOT, 'plate21', 'module', 'pages')
CN_DIGITS = str.maketrans('0123456789', '〇一二三四五六七八九')

def norm(s):
    s = re.sub(r'\s+', '', s)
    for ch in '“”"「」‘’,，、；;：:——…！!？?()（）[]【】':
        s = s.replace(ch, '')
    return s

def to_cn(s):
    return norm(s).translate(CN_DIGITS)

page_texts = {}

wp = io.open(os.path.join(PAGES, 'waypoint', 'waypoint.js'), encoding='utf-8').read()
for m in re.finditer(r"\{\s*speaker:\s*'([^']+)',(?:\s*aside:\s*'([^']+)',)?\s*text:\s*'([^']+)',\s*clipId:\s*'([^']+)'", wp):
    page_texts[m.group(4)] = m.group(3)

for dirpath, _, files in os.walk(PAGES):
    for f in files:
        if not f.endswith('.wxml'):
            continue
        s = io.open(os.path.join(dirpath, f), encoding='utf-8').read()
        for m in re.finditer(r'<dialogue-block([^>]*?)/>', s, re.S):
            attrs = m.group(1)
            t = re.search(r'text="([^"]*)"', attrs)
            c = re.search(r'clip-id="([^"]*)"', attrs)
            if t and c and '{{' not in t.group(1) and '{{' not in c.group(1):
                page_texts[c.group(1)] = t.group(1)

man = json.load(io.open(os.path.join(ROOT, 'tools', 'voice_manifest.json'), encoding='utf-8'))
dlgs = {c['id']: (''.join(c['text']) if isinstance(c['text'], list) else c['text'])
        for c in man['clips'] if c['id'].startswith('dlg-')}

problems, digit_notes = [], []

def diff_kind(mtext, ptext):
    if norm(mtext) == norm(ptext):
        return 'same'
    if to_cn(mtext) == to_cn(ptext):
        return 'digit-style'
    return 'diff'

for cid in sorted(dlgs):
    if cid not in page_texts:
        problems.append(('页面缺台词块', cid, ''))
        continue
    k = diff_kind(dlgs[cid], page_texts[cid])
    if k == 'digit-style':
        digit_notes.append(('数字写法差', cid, 'manifest=%s | page=%s' % (dlgs[cid][:36], page_texts[cid][:36])))
    elif k == 'diff':
        problems.append(('台词不一致', cid, 'manifest=%s… | page=%s…' % (dlgs[cid][:40], page_texts[cid][:40])))
for cid in sorted(page_texts):
    if cid not in dlgs:
        problems.append(('manifest缺条目', cid, ''))

# ---- 旁白：页面源码 → 纯文本，逐段命中 ----
NARR_PAGE = {
    'narr-prologue': [('prologue', 'prologue.js')],
    'narr-s1-decode': [('s1-decode', 's1-decode.wxml')],
    'narr-s2-quiz': [('s2-quiz', 's2-quiz.wxml')],
    'narr-s2-reveal': [('s2-reveal', 's2-reveal.wxml')],
    'narr-s2-blend': [('s2-blend', 's2-blend.wxml')],
    'narr-s2-pattern': [('s2-pattern', 's2-pattern.js'), ('s2-pattern', 's2-pattern.wxml')],
    'narr-s3-comic': [('s3-comic', 's3-comic.wxml')],
    'narr-s3-zodiac': [('s3-zodiac', 's3-zodiac.wxml')],
    'narr-s3-water': [('s3-water', 's3-water.wxml')],
    'narr-s4-password': [('s4-password', 's4-password.wxml')],
    'narr-s4-timeline': [('s4-timeline', 's4-timeline.js'), ('s4-timeline', 's4-timeline.wxml')],
    'narr-finale': [('finale', 'finale.js')],
    'narr-waypoint-xieqiqu': [('waypoint', 'waypoint.js')],
    'narr-waypoint-yangquelong': [('waypoint', 'waypoint.js')],
    'narr-waypoint-fangwaiguan': [('waypoint', 'waypoint.js')],
    'narr-waypoint-xushuilou': [('waypoint', 'waypoint.js')],
    'narr-waypoint-guanshuifa': [('waypoint', 'waypoint.js')],
    'narr-waypoint-xianfahua': [('waypoint', 'waypoint.js')],
}

def page_plain(page, src):
    s = io.open(os.path.join(PAGES, page, src), encoding='utf-8').read()
    if src.endswith('.wxml'):
        s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
        s = re.sub(r'<[^>]+>', '', s)
        s = re.sub(r'\{\{[^}]*\}\}', '', s)
    else:
        # 抽 JS 字符串字面量（'…' 与 "…"），含数组项
        parts = re.findall(r"'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\"", s)
        s = '\n'.join(a or b for a, b in parts)
    return s, to_cn(s)

narr_miss = []
for nid, sources in NARR_PAGE.items():
    clip = next((c for c in man['clips'] if c['id'] == nid), None)
    if not clip:
        continue
    parts = [page_plain(page, src) for page, src in sources]
    joined = '\n'.join(b for b, _ in parts)
    body_n = norm(joined)
    body_cn_n = to_cn(joined)
    texts = clip['text'] if isinstance(clip['text'], list) else [clip['text']]
    for para in texts:
        if norm(para) in body_n:
            continue
        if to_cn(para) in body_cn_n:
            continue
        narr_miss.append((nid, para[:48]))

print('台词比对：%d 页面块 vs %d manifest 条' % (len(page_texts), len(dlgs)))
for kind, cid, detail in problems:
    print(' - [%s] %s :: %s' % (kind, cid, detail))
for kind, cid, detail in digit_notes:
    print(' - [%s] %s :: %s' % (kind, cid, detail))
if narr_miss:
    print('旁白未命中 %d 段：' % len(narr_miss))
    for nid, p in narr_miss:
        print(' - [%s] %s…' % (nid, p))
if not problems and not narr_miss:
    print('AUDIT OK：台词逐字一致（数字写法差异 %d 处仅提示）；旁白全部命中' % len(digit_notes))
    sys.exit(0)
sys.exit(1)
