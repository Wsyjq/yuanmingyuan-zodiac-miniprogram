# -*- coding: utf-8 -*-
"""重建 v2 改动展示画廊：全页截图 + 文案逐句对照 + 改动统计。用法：python test/harness/build-gallery-v2.py"""
import base64, io, os, subprocess

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHOTS = os.path.join(ROOT, 'test', 'shots-v2')
OLD = os.path.join(ROOT, 'test', 'shots-h5')
OUT = os.path.join(ROOT, 'docs', 'v2快速迭代改动展示-20260910.html')


def to_jpeg_b64(png_path, width=375):
    out = png_path + '___t.jpg'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', png_path, '-vf', 'scale=%d:-1' % width, '-q:v', '7', out], check=True)
    data = open(out, 'rb').read()
    os.remove(out)
    return base64.b64encode(data).decode(), len(data)


ITEMS = [
    ('S01', 'v2-01-prologue-letter.png', '序章 · 接棒信（改·全页）', '一句话信 → 六段接棒信：“对得上的划个勾，对不上的写下来；档案不用还我，你走完它就跟着你了。”', '02-prologue.png', True),
    ('S02', 'v2-02-transit-side.png', '站间过渡 · 顺路支线入口（改·全页）', '主线不动；底部新增铜绿虚线“顺路·支线可选”卡（本图为 s3-s4 段）。', '04-transit.png', True),
    ('S03', 'v2-03-wp-xieqiqu.png', '支线 S·A 谐奇趣（新页·全页）', '手迹页（铜版画校样·伊兰泰画了六年）＋现场听＋取景框卡＋母题句。', None, True),
    ('S04', 'v2-04-wp-yangquelong.png', '支线 S·B 养雀笼（新页·全页）', '手迹页（最早那批遗址照片·泛指）＋东西两半＋叠层卡合门。', None, True),
    ('S05', 'v2-05-wp-fangwaiguan.png', '支线 S·C 方外观（新页·全页）', '开场“档案里关于这座殿只有一行字”；容妃口径必读块；等候卡红线=不提交不进池。', None, True),
    ('S06', 'v2-06-wp-xushuilou.png', '支线 S·D 蓄水楼（新页·全页）', '量高绳＋手迹“三页纸与一处空栏”（守档人不敢勾）。', None, True),
    ('S07', 'v2-07-wp-xushuilou-reveal.png', '支线 S·D 蓄水楼 · 拼合后（新页·全页）', '“我拼好了”之后才展开的卡条背面注释＋“隔了两百四十年，记下的对不上”。', None, True),
    ('S08', 'v2-08-dsf-intro.png', '支线 S·F 大水法 · 留白站（新页）', '转场句“翻到下一站，那一页是空的”＋规则说明。', None, False),
    ('S09', 'v2-09-dsf-silence.png', '大水法 · 两分钟静默（新页）', '近乎空白的倒计时页——废墟即缺席。', None, False),
    ('S10', 'v2-10-dsf-question.png', '大水法 · 三选一（新页）', '静默后唯一一次操作，可跳过、不评判。', None, False),
    ('S11', 'v2-11-dsf-done.png', '大水法 · 收尾（新页）', '“这里没有题目。你听见什么，它就是什么。”', None, False),
    ('S12', 'v2-12-wp-xianfahua.png', '支线 S·E 线法画（新页·全页）', '样式雷收口句＋雪山线稿“放下纸，又没有了”。', None, True),
    ('S13', 'v2-13-guide-s4-deep.png', '语音导览 · 深讲层＋前人明信片（改）', '“再听一段”永远折叠；雨果站深讲层挂“上一手留下的明信片”（一张，不是一堆）。', None, False),
    ('S14', 'v2-14-report-echo.png', '报告页 · 回响区（改·全页）', '终章后新增：明信片投递面板＋“明日启封”封蜡卡——页面变长，改动在下半段，全页可见。', '15-report.png', True),
    ('S15', 'v2-15-report-echo-sent.png', '报告页 · 已投递（改·全页）', '投递后：原句落档＋“下一位会读到你写的那一句”＋次日之信可开启。', None, True),
    ('S16', 'v2-16-letter-sealed.png', '回响 · 封蜡态（新页）', '当日显示“明日启封”——盒子纸悬念的承接。', None, False),
    ('S17', 'v2-17-letter-open.png', '回响 · 开信（新页）', '竖排信纸、读完无按钮；动态段=你的明信片；收束“往后，档案跟着你了”。', None, False),
    ('S18', 'v2-18-handbook-side.png', '考察手册 · 支线栏（改·全页）', '第伍折后新增：顺路 X/6 芯片（随时进入）＋次日之信封蜡入口。', '17-handbook.png', True),
    ('S19', 'v2-19-finale-novel-new.png', '结局 · 顿悟段（改·翻至 03/08 页）', '宣言排比删除，换为翻档案的顿悟：“同一幅画，一个人画不完的那一幅”。', '14b-finale-novel.png', False),
]

DIFFS = [
    ('序章 · 信中内容', '“如果你想知道第二十一幅铜版画的秘密，就去圆明园西洋楼遗址吧，里面也许会有你想要的答案。”',
     '这份档案到我手里的时候，已经换过好几双手。……现在轮到你走一遍。走到每一处，翻到对应的页，替我看一眼：他们记下的，和地上剩下的，还对不对得上。对得上的，划个勾。对不上的，写下来。档案不用还我。你走完，它就跟着你了。'),
    ('结局 · 宣言段 → 顿悟段', '其实，它从未被藏在某个地方。因为它从来不是一幅等待被发现的旧画。它是一幅等待被后来者完成的“新画”。……它记录毁灭，也记录重生。记录失去，也记录被重新看见。',
     '我把档案夹摊开在膝盖上，从头翻了一遍。刻版人的线、砌墙人的照片、写信人的信、考古队探出的圈——我把它们从头翻了一遍才明白：他们记的从来不是二十处房子。是同一幅画，一个人画不完的那一幅。'),
    ('报告/结局 · L1 题跋', '前二十幅记录建成，此幅记录毁灭之后——被修复，被注视，被重新看见。',
     '前二十幅记录建成，此幅记录后来——刻版人的线，砌墙人的照片，你的勾。'),
    ('雨果站导览 · 开场', '1860年圆明园罹劫。次年，并未到过中国的雨果写下《致巴特勒上尉的信》。',
     '档案里离得最远的一手，来自一个从没来过中国的人。1860年圆明园罹劫；次年，他写下《致巴特勒上尉的信》。'),
    ('回响信 · 新增首尾', '（无）', '信首：“先认一件事：序章那行铅笔字，是我写的。卡片是民国的，字不是。”／信尾：“往后，档案跟着你了。”（候选句，待拍板）'),
    ('黄花阵深讲 · 1987 伏笔载体', '这道墙看着老，其实不是乾隆年间的原物。1987年和1989年……',
     '档案里夹着一张1987年的工地照片。照片背面一行钢笔字：照原图，复位。这道墙不是乾隆年间的原物——1987年和1989年……'),
    ('蓄水楼 · 新增手迹段', '（无）', '“关于这台机器怎么转，档案里有三页纸，年代都不一样。……三页纸的末尾，都留着同一处空栏——整理这册档案的人，哪一页也没敢勾。”＋“隔了两百四十年，两代人对着同一台机器，记下的东西对不上。”'),
    ('前人明信片标签', '一位考察者留下的明信片', '上一手留下的明信片'),
]

SECTIONS = [
    ('二、剧情文案调整（逐句对照）', ['__DIFF__']),
    ('三、可选支线：六个顺路站点（主线零改动）', ['S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S10', 'S11', 'S12', 'S18']),
    ('四、解说词双版本与前人明信片', ['S13']),
    ('五、回响（次日之信）与明信片投递', ['S14', 'S15', 'S16', 'S17', 'S01', 'S19']),
]


def main():
    imgs = {}
    total = 0
    for uid, fn, _, _, old, _tall in ITEMS:
        b, n = to_jpeg_b64(os.path.join(SHOTS, fn))
        imgs[uid] = b
        total += n
        if old:
            b2, n2 = to_jpeg_b64(os.path.join(OLD, old))
            imgs[uid + '_old'] = b2
            total += n2
    print('jpeg total KB:', total // 1024)

    st = subprocess.run(['git', 'diff', '--shortstat', '8ed80b2..3eea0b8'], capture_output=True, text=True, cwd=ROOT).stdout.strip()
    stat_html = ('本次合并 <b>%s</b>（基线 8ed80b2 → 3eea0b8，41 个文件：19 修改 + 22 新增）。'
                 '新增页面：letter 回响页、waypoint 顺路站×5、dashuifa 留白站；新增机制：明信片投递/回读、解说词深讲层、'
                 '顺路支线记账＋「顺路人」印记；文案按《历代记录者接力》改写计划落地 12 处。'
                 '测试 103/103 绿；微信平台已传 v2.1.0（总包 1.4MB）。' % st)

    seen = set()
    parts = []
    for title, ids in SECTIONS:
        if '__DIFF__' in ids:
            rows = ''.join(
                '<div class="diff"><div class="dt">%s</div><div class="cols">'
                '<div class="old"><span>旧</span>%s</div><div class="new"><span>新</span>%s</div>'
                '</div></div>' % (t, o, n) for t, o, n in DIFFS)
            parts.append('<h2>%s</h2>%s' % (title, rows))
            continue
        rows = []
        for uid in ids:
            if uid in seen:
                continue
            seen.add(uid)
            meta = next(i for i in ITEMS if i[0] == uid)
            old_html = ''
            if uid + '_old' in imgs:
                old_html = ('<figure class="shot"><img src="data:image/jpeg;base64,%s">'
                            '<figcaption>改前（主线基线）</figcaption></figure>' % imgs[uid + '_old'])
            tall_cls = ' class="tall"' if meta[5] else ''
            cap = '改后（全页截图）' if old_html else '新页面'
            rows.append('<div class="card"><div class="cap"><span class="tag">%s</span>'
                        '<span class="desc">%s</span></div><div class="figs">%s'
                        '<figure class="shot"><img%s src="data:image/jpeg;base64,%s">'
                        '<figcaption>%s</figcaption></figure></div></div>'
                        % (meta[2], meta[3], old_html, tall_cls, imgs[uid], cap))
        parts.append('<h2>%s</h2>%s' % (title, '\n'.join(rows)))

    html = u'''<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>第廿一图 · v2 快速迭代改动展示（修订版 2026-09-10）</title>
<style>
body{font-family:"Microsoft YaHei",system-ui,sans-serif;background:#efe9db;margin:0;color:#2e2618}
.wrap{max-width:1080px;margin:0 auto;padding:32px 20px 64px}
h1{font-size:26px;letter-spacing:2px} .sub{color:#6b5d48;font-size:14px;line-height:1.9}
.badge{display:inline-block;background:#4a6b64;color:#f4efe3;border-radius:4px;padding:2px 10px;font-size:12px;margin-right:6px}
h2{font-size:19px;margin:40px 0 6px;border-left:4px solid #a63a2e;padding-left:10px}
.stat{background:#faf6ec;border:1px solid #d8cdb4;border-radius:10px;padding:14px 16px;font-size:14px;line-height:2}
.card{background:#faf6ec;border:1px solid #d8cdb4;border-radius:10px;padding:14px 16px;margin:14px 0}
.cap{margin-bottom:10px} .tag{font-weight:700;font-size:16px} .desc{display:block;color:#6b5d48;font-size:13.5px;line-height:1.8;margin-top:4px}
.figs{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start}
figure.shot{margin:0;flex:0 0 200px;max-width:230px}
img{width:100%;border:1px solid #c9bda1;border-radius:6px;display:block}
figure.shot img.tall{width:200px}
figcaption{text-align:center;font-size:12px;color:#8a7a60;padding-top:6px}
.diff{background:#faf6ec;border:1px solid #d8cdb4;border-radius:10px;padding:14px 16px;margin:12px 0}
.dt{font-weight:700;font-size:15px;margin-bottom:8px}
.cols{display:flex;gap:12px;flex-wrap:wrap}
.cols>div{flex:1 1 320px;border-radius:8px;padding:10px 14px;font-size:13.5px;line-height:1.9}
.old{background:#f6e3dd;border:1px solid #d9a79b} .new{background:#e4ede7;border:1px solid #a3bfae}
.cols span{display:inline-block;font-size:11px;color:#fff;border-radius:3px;padding:1px 8px;margin-right:8px}
.old span{background:#a63a2e} .new span{background:#4a6b64}
.note{background:#f3ead2;border:1px dashed #b9a87f;border-radius:8px;padding:12px 16px;font-size:13.5px;line-height:2;margin-top:18px}
</style></head><body><div class="wrap">
<h1>《第廿一图》v2 快速迭代 · 改动展示（修订版）</h1>
<div class="sub">
<span class="badge">已合并 main 3eea0b8</span><span class="badge">已推 GitHub</span><span class="badge">微信 v2.1.0 已上传</span><span class="badge">103 项测试全绿</span><br>
修订说明：长页改为<b>全页截图</b>（报告页/手册/支线站完整可见，改动不再被首屏裁掉）；结局翻至<b>顿悟段所在页（03/08）</b>；新增<b>文案逐句对照</b>与<b>改动统计</b>两节。截图由 H5 台架渲染，状态脚本驱动。
</div>
<h2>一、改了多少（数据）</h2><div class="stat">''' + stat_html + '''</div>
''' + '\n'.join(parts) + '''
<div class="note"><b>尚未包含（后续项）：</b>次日推送通道（订阅消息）｜真实留言池（现为本地种子 8 张，接后端即换）｜谐奇趣双声道音频｜观水法/远瀛观｜BGM 接入（超分包预算）｜深讲播讲稿录音。<br>
<b>文案红线自查通过：</b>剧内无“接力/接棒/棒次”等设定词；无“记录毁灭也记录重生/被重新看见/我们应当”类宣告句式（grep 零命中）。奥尔末与二十幅图序两个前置核对项未完，手迹页已按降级口径（泛指、不写“第一座楼”）。</div>
</div></body></html>'''

    io.open(OUT, 'w', encoding='utf-8').write(html)
    print('written', OUT, os.path.getsize(OUT) // 1024, 'KB')


if __name__ == '__main__':
    main()
