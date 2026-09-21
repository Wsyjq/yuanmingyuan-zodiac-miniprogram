# -*- coding: utf-8 -*-
"""Pack v3 vs original screenshots into one self-contained HTML."""
from io import BytesIO
from pathlib import Path
import base64
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'v3-vs-original.html'

PAIRS = [
    {
        'title': '序章 · 档案交接',
        'badge': '新增路线图',
        'note': '清点页补上现场路线图，并手写标出新踏线：入口 · 谐奇趣 · 黄花阵 · 方外观 · 海晏堂 · 蓄水楼 · 大水法 · 雨果雕像。',
        'old': 'test/shots-h5/audit-03b-prologue-handover.png',
        'new': 'test/shots-v3new/v3-prologue-handover.png',
    },
    {
        'title': '谐奇趣',
        'badge': '散页改计分主线',
        'note': '原来是「顺路」翻页听人声。现在一屏：铜版《谐奇趣南面》+ 听约三十秒声景 + 六选（小拉琴 / 西洋箫 / 琵琶 / 笙 / 班竹板 / 水声）。',
        'old': 'test/shots-h5/audit-06-wp-xieqiqu.png',
        'new': 'test/shots-v3new/v3-xieqiqu.png',
    },
    {
        'title': '黄花阵 · 修建目的',
        'badge': '开放作答改四选',
        'note': '原来是写下「他们在干什么」。现在对照迷宫图，四选修建目的，标准答案是中秋灯会。',
        'old': 'test/shots-h5/audit-07-s2-quiz.png',
        'new': 'test/shots-v3new/v3-s2-quiz.png',
    },
    {
        'title': '黄花阵 · 名字由来',
        'badge': '三次揭晓',
        'note': '仍是文字作答，加上字数和剩余次数。答错给递进提示，第三次直接揭晓史料卡。语音输入已去掉。',
        'old': 'test/shots-h5/audit-08-s2-reveal.png',
        'new': 'test/shots-v3new/v3-s2-reveal.png',
    },
    {
        'title': '黄花阵 · 第三次揭晓史料卡',
        'badge': '新增状态',
        'note': '三次没说中，弹出史料卡全文并发卡。原版没有这张卡层。',
        'old': None,
        'old_empty': '无此弹层',
        'new': 'test/shots-v3new/v3-s2-reveal-card.png',
    },
    {
        'title': '方外观',
        'badge': '散页改计分主线',
        'note': '原来是「顺路」叙事。现在对照《方外观正面》铜版，选出真正属于这座楼的三项（西式楼体 / 中式屋顶 / 阿拉伯文碑刻）。',
        'old': 'test/shots-h5/audit-13-wp-fangwaiguan.png',
        'new': 'test/shots-v3new/v3-fangwaiguan.png',
    },
    {
        'title': '海晏堂 · 正午水力钟',
        'badge': '整页改写',
        'note': '原来是蒋友仁台词 +「午时哪尊兽首将喷水」圆钮。现在用日记原句「十二兽各守一时，至午而全见」，四选正午会怎样。',
        'old': 'test/shots-h5/audit-14-s3-comic.png',
        'new': 'test/shots-v3new/v3-s3-comic.png',
    },
    {
        'title': '蓄水楼',
        'badge': '散页改计分主线',
        'note': '原来是「顺路」拼卡引导。现在点明这是海晏堂北面那座（不是谐奇趣西北那座），高低二选。',
        'old': 'test/shots-h5/audit-18-wp-xushuilou.png',
        'new': 'test/shots-v3new/v3-xushuilou.png',
    },
    {
        'title': '大水法 · 猎狗归位',
        'badge': '整页改写',
        'note': '原来是两分钟现场静默。现在对照《大水法南面》铜版，把鹿、猎狗、兽放回喷水池位置。',
        'old': 'test/shots-h5/audit-19-dashuifa.png',
        'new': 'test/shots-v3new/v3-dashuifa-hunt.png',
    },
    {
        'title': '大水法 · 以水成戏之后',
        'badge': '新增状态',
        'note': '三件归位后的收束，引出「以水成戏」，再请游客往北看。原版没有这一拍。',
        'old': None,
        'old_empty': '无此屏',
        'new': 'test/shots-v3new/v3-dashuifa-after.png',
    },
    {
        'title': '大水法 · 北望远瀛观',
        'badge': '全新一屏',
        'note': '原版没有这一问。猎狗归位后往北看，四选高台上的建筑。',
        'old': None,
        'old_empty': '原版没有这一屏',
        'new': 'test/shots-v3new/v3-dashuifa-yuan.png',
    },
    {
        'title': '大水法 · 看完远瀛观往东',
        'badge': '新增收束',
        'note': '选对或三次揭晓后，说明南北轴不是下一站，引出雨果《致巴特勒上尉的信》。',
        'old': None,
        'old_empty': '无此屏',
        'new': 'test/shots-v3new/v3-dashuifa-yuan-done.png',
    },
    {
        'title': '大水法 · 原版听完一问',
        'badge': '已删除',
        'note': '原版静默结束后用吊牌问「刚才那两分钟听见的是什么」。v3 不再问现场声音。',
        'old': 'test/shots-h5/audit-19b-dashuifa-question.png',
        'new': None,
        'new_empty': '已删除，改为猎狗归位 + 北望',
    },
]


def data_uri(rel):
    path = ROOT / rel
    im = Image.open(path)
    if im.mode in ('RGBA', 'LA', 'P'):
        bg = Image.new('RGB', im.size, (243, 234, 216))
        src = im.convert('RGBA')
        bg.paste(src, mask=src.split()[-1])
        im = bg
    else:
        im = im.convert('RGB')
    im.thumbnail((420, 5000), Image.Resampling.LANCZOS)
    buf = BytesIO()
    im.save(buf, 'JPEG', quality=68, optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode('ascii')
    return 'data:image/jpeg;base64,' + b64


def img_tag(rel, alt):
    return '<img class="phone" src="%s" alt="%s">' % (data_uri(rel), alt)


def empty_box(text):
    return '<div class="empty">%s</div>' % text


def pair_html(item):
    old = img_tag(item['old'], item['title'] + ' 原版') if item.get('old') else empty_box(item.get('old_empty') or '原版没有这一屏')
    new = img_tag(item['new'], item['title'] + ' v3') if item.get('new') else empty_box(item.get('new_empty') or '截图失败')
    return """
<section class="pair">
  <header><h2>%s</h2><span class="badge">%s</span></header>
  <p class="note">%s</p>
  <div class="cols">
    <figure><figcaption>原版 V2.3</figcaption>%s</figure>
    <figure><figcaption>现在 v3</figcaption>%s</figure>
  </div>
</section>""" % (item['title'], item['badge'], item['note'], old, new)


html = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>v3 相对原版 · 新增对照</title>
<style>
:root{--paper:#f3ead8;--ink:#2b2926;--patina:#5c6b58;--cinnabar:#8c2f2a;--rule:#d4c7aa}
*{box-sizing:border-box}
body{margin:0;font-family:"Source Han Serif SC","Noto Serif SC","Songti SC",serif;background:#e7dcc4;color:var(--ink);line-height:1.55}
.wrap{max-width:980px;margin:0 auto;padding:32px 20px 80px}
h1{font-size:28px;font-weight:600;margin:0 0 8px}
.lead{color:#5a5348;margin:0 0 28px}
.flow{background:var(--paper);border:1px solid var(--rule);padding:16px 18px;margin-bottom:28px}
.flow strong{color:var(--cinnabar)}
.pair{background:var(--paper);border:1px solid var(--rule);padding:18px 18px 22px;margin-bottom:22px}
.pair header{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.pair h2{margin:0;font-size:20px;font-weight:600}
.badge{font-size:12px;letter-spacing:.08em;color:#fff;background:var(--cinnabar);padding:2px 8px}
.note{margin:8px 0 16px;color:#5a5348;font-size:14px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
figure{margin:0}
figcaption{font-size:12px;letter-spacing:.16em;color:var(--patina);margin-bottom:8px}
.phone{width:100%%;max-width:375px;display:block;border:1px solid #cbbfa6;background:#fff}
.empty{min-height:220px;border:1px dashed #b7aa90;display:flex;align-items:center;justify-content:center;color:#8a7f6c;background:repeating-linear-gradient(-45deg,#efe6d4,#efe6d4 8px,#eadfcb 8px,#eadfcb 16px);padding:16px;text-align:center}
.out{background:#efe6d4;border-left:3px solid var(--patina);padding:12px 16px;margin-bottom:22px;font-size:14px}
@media(max-width:760px){.cols{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
<h1>v3 相对原版 · 新增对照</h1>
<p class="lead">单文件，图已嵌进页面。左边是 1.0.0 / V2.3 审计截图，右边是当前工作树。只列相对原版新出现或整页改写的地方。</p>
<div class="flow">
<div>原版主线：入口 → 黄花阵四事 → 海晏堂漫画/兽首/蓄水 → 大水法两分钟静默 → 雨果。谐奇趣 / 方外观 / 蓄水楼是顺路散页，只翻不答题。</div>
<div style="margin-top:8px">现在主线：入口 → <strong>谐奇趣声景</strong> → 黄花阵四事 → <strong>方外观三选</strong> → 海晏堂正午 → <strong>蓄水楼高低</strong> → <strong>大水法猎狗 + 北望远瀛观</strong> → 雨果。</div>
</div>
<div class="out">从主线拿掉、改成手册可进：养雀笼、观水法、线法画仍是散页；<strong>s3-zodiac 兽首、s3-water 喷泉原理</strong>不再走主线，日期卡分别改由方外观、蓄水楼写入。</div>
%s
</div>
</body>
</html>
""" % '\n'.join(pair_html(item) for item in PAIRS)

OUT.write_text(html, encoding='utf-8')
print(OUT, OUT.stat().st_size)
