#!/usr/bin/env node
/**
 * check_plot_sync.js —— 飞书剧情（docs/feishu-import/第廿一图_v3-rev5614.md）与
 * 小程序上屏文字的双向逐句核对。第三轮口径：
 *  - 拼接语料过滤非 CJK 字面量（gloss 键/路径/id 不再切断句子）
 *  - 子句未命中时按 ：再拆，逐段核对（文档长句在 UI 里常被引用块/插图分段）
 *  - 文档挂点锚按渲染意图映射（MANUAL_EQUIV），其余剥除
 *  - DOC_SKIP 同时作用于行与子句；支线散页站点（养雀笼/观水法/线法画）不参与反向核对
 * 用法：node tools/check_plot_sync.js [--verbose]
 */
'use strict'
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DOC = path.join(ROOT, 'docs/feishu-import/第廿一图_v3-rev5614.md')

const MAINLINE_FILES = [
  'plate21/module/content/prologue.js',
  'plate21/module/content/s2-quiz.js',
  'plate21/module/content/s2-reveal.js',
  'plate21/module/content/s2-blend.js',
  'plate21/module/content/s2-pattern.js',
  'plate21/module/pages/prologue/prologue.wxml',
  'plate21/module/pages/s1-decode/s1-decode.js',
  'plate21/module/pages/s1-decode/s1-decode.wxml',
  'plate21/module/pages/s2-quiz/s2-quiz.wxml',
  'plate21/module/pages/s2-reveal/s2-reveal.wxml',
  'plate21/module/pages/s2-blend/s2-blend.wxml',
  'plate21/module/pages/s2-pattern/s2-pattern.wxml',
  'plate21/module/pages/waypoint/waypoint.js',
  'plate21/module/pages/s3-comic/s3-comic.js',
  'plate21/module/pages/s3-comic/s3-comic.wxml',
  'plate21/module/pages/s3-zodiac/s3-zodiac.wxml',
  'plate21/module/pages/s3-water/s3-water.wxml',
  'plate21/module/pages/dashuifa/dashuifa.js',
  'plate21/module/pages/dashuifa/dashuifa.wxml',
  'plate21/module/pages/s4-timeline/s4-timeline.js',
  'plate21/module/pages/s4-timeline/s4-timeline.wxml',
  // s4-password（密码锁）在 rev5614 正文中已删除，页面仅留作旧存档兼容，不参与剧情核对
  'plate21/module/pages/finale/finale.js',
  'plate21/module/pages/finale/finale.wxml',
  'plate21/module/pages/ending/ending.wxml',
  'plate21/module/pages/letter/letter.js',
  'plate21/module/pages/letter/letter.wxml',
  'plate21/module/pages/report/report.wxml',
  'plate21/module/pages/transit/transit.js'
]

// waypoint.js 中的支线散页站点（v3 正文之外的可选补充内容），反向核对跳过
const SIDE_SITE_KEYS = ['yangquelong', 'guanshuifa', 'xianfahua']

// 文档挂点锚 → 上屏渲染（锚内名称本来就是正文一部分的，按渲染意图还回）
const MANUAL_EQUIV = [
  ['牛皮纸【DJ-02 档案袋】已经发黄', '牛皮纸档案袋已经发黄']
]

const BACKWARD_EXEMPT = [
  '听 · ', '学到了', '继 续', '继续', '记 下 了', '就 是', '进 阵', '放 好 了', '往北看', '前往',
  '正在保存', '进度保存失败', '进度暂未保存', '页面跳转失败', '考察记录已保存', '档案已收好',
  '正在调取', '正在开启', '正在解锁', '检票中', '正在重新建立档案', '正在完成考察', '保存中',
  '线下道具', '操作提示', '显影提示', '需要提示', '不连了，直接摊开档案', '就地摊开档案',
  '把它们连起来看看', '编号按史料卡取得顺序归档', '你从各处卡片角落记下的数字',
  '圆明园西洋楼景区史料', '国家文物局公开资料', '圆明园管理处', '历史人物 · 台词为艺术演绎',
  '依据史料重构，不是当年的谱', '先听完再勾', '戴上耳机', '已放', '已选择', '已记录', '待拍摄',
  '重新拍摄', '现场拍摄', '相册补录', '打开权限设置', '正在保存照片', '现场记录进度',
  '提示一', '提示二', '答案', '考察记录 · 第二站', '路线：', '缓步徐行', '路上的页',
  '档案里还夹着一页', '已翻过', '翻看顺路散页', '正在前往', '继续前往', '实体', '道具交接', '道具收尾',
  '请将', '请根据', '观察', '选出', '拖拽', '拍', '填', '输入', '密码', '确认', '核对',
  '版本编号', '第 N 版', '玩家姓名', '今日日期', '散页残片', '卡背', '不拍照', '不提交', '自校验',
  '黄花阵 · ', '海晏堂 · ', '蓄水楼 · ', '方外观 · ', '谐奇趣 · ', '大水法 · ', '雨果', '线法画', '养雀笼', '观水法',
  '时间轴 · 西洋楼', '十二兽首 · 回归纪实', '马首铜像 · 回归纪实', '回归纪实',
  '西洋楼铜版图 · 第二十一图', '西洋楼铜版图·第二十一图', '今日对读', '非馆藏原件',
  '考察之日', '考察记录生成', '绘制者', '绘制时间', '绘制日期', '落款', '题跋',
  '再想想', '再核对', '再观察', '再看看', '已选', '再点对应年份', '归位正确', '年份没有对应',
  '八张', '残片', '角落', 'YYYY', '建档', '凭证', '明信片', '信箱', '留言', '开放问',
  '不给选项', '不投票', '不点评', '按走过的顺序', '拼错', '只有一种排列', '长卷',
  '只涂自家道具纸', '占位', '预览', '想写就写', '切换匿名', '投递', '次日之信', '明日启封',
  '有一封信在等你', '来自那个还在整理档案的人', '返回', '保存到相册', '已收入考察手册',
  '收入考察手册', '考察手册', '现场照片', '补录', '拓印', '回响', '写下', '重写', '审核',
  '中间那块空着', '愿意被匿名引用', '报告', '相册', '画布', '截屏', '无名氏', '已取消',
  '重试', '失败', '权限', '设置', '设备', '页面', '考察报告', '手册', '首页', '模块',
  '门票', '解锁', '账号', '长期有效', '一贴一响', 'NFC', 'nfc', '让历史的旋律',
  '七个生肖', '转盘', '水显纸', '蘸点水', '晾干', '平放', '浸泡', '远离手机', '清水', '微湿',
  '生肖', '顿号', '马首', '何鸿燊', '国家文物局', '正觉寺', '文殊亭', '巡展', '澳门', '兽首',
  '喷泉', '水力钟', '时辰', '子时', '丑时', '正午', '鼠首', '牛首', '水位', '日影',
  '梅花鹿', '猎狗', '卷尾铜兽', '喷水池', '高台', '远瀛观', '南北相对', '狗围着鹿',
  '1747', '1760', '1860', '1861', '2010', '2006', '事件卡', '时间轴', '排序', '归位', '年份',
  '中法文化交流', '劫火', '营造', '掠夺', '西洋楼开始建造', '早期核心景观', '火烧圆明园', '雕像落成',
  '拼合', '生成中', '署名', '写下你的名字', '落款中', '归档', '回显', '你留下的',
  '见字如面', '整理信笺', '完成你的考察', '等你', '考察结束', '写给你的信',
  '拓包', '手账', '离场视频', '跳过', 'VID', '视频', '贴纸', '编号', '吊牌', '邮戳', '标本', '干花',
  '西洋楼遗址', '圆明园', '长春园', '铜版图', '铜版画', '二十幅', '第二十一',
  // 谜题机制与史料卡（文档互动设计块授权的 UI 文案）
  '提着灯往中心亭跑', '「黄花」二字从何而来', '对照手里的图', '回转连绵',
  '西式穹顶', '中式八角飞檐', '莲座', '宝瓶', '双天鹅', '蝙蝠', '檐角', '西学东渐', '本土化改造', '清宫石匠',
  '万字回纹', '万字不断纹', '福寿绵长', '墙上反复出现', '听见了哪些声音', '再听一次', '拨弦',
  '琵琶、小拉琴、西洋箫，和水', '声音进入的先后', '小拉琴', '叠了哪三样', '对照铜版', '翻特刊',
  '一样东西放在哪儿，才算被保住了', '你站着的位置', '跟着你走完全程',
  // 海晏堂补充页（v3 正文未收录，保留机制待拍板）
  '已有一批回到祖国', '池两侧的座基', '座身上的花纹', '哪一尊坐哪一座', '认水', '看它显出谁来',
  '正午值班', '正午轮到', '七尊里正好有马', '把回来的名字', '七个', '尊',
  // 图片批注与装饰（铜版画对照注、手账批注、留言板入口）
  '提灯往中心亭跑', '档案里的《', '对照档案里这张《', '残柱已经戳在视线尽头', '对不齐',
  '去看看大家的话', '留一句话', '下一位来到这里的人',
  // rev5614 新增 UI 引导与机制
  '推送彩蛋', '点开看看', '点它看看', '未时', '离园之后', '揭 晓', '揭晓',
  '写一个生肖', '每个时辰两个小时', '一页仿旧信纸', '档案的最后一页'
]

const DOC_SKIP = new RegExp([
  '^【', '^［', '^\\[', '^（', '^\\(', '^🟦', '^🟨',
  '^制作注', '^设计意图', '^设计说明', '^本章简介', '^本章概览', '^史料基础', '^剧情内容', '^互动玩法',
  '^景点解读', '^音画脚本', '^页面与状态', '^史料卡', '^伏笔与终局', '^现场条件与替代',
  '^点击特殊颜色', '^这个语音播报', '^道具做成', '^参考示意', '^后期', '^图片', '^!\\[', '^<',
  '^编号说明', '^\\d+\\.', '^主要包含的内容', '^涉及点位', '^总体规划', '^全局设定', '^故事想回应',
  '^圆明园西洋楼存在', '^寻画的终点', '^西洋楼铜版画二十幅对照',
  '^答案', '^正确答案', '^问题：', '^——', '^终局谜题', '^最终谜题', '^拓展：',
  '^翻面揭晓答案', '^给出\\s*4\\s*种花纹', '^小程序给出', '^三张卡片选择正确后',
  '^请将', '^观察《', '^梅花鹿', '^十只猎狗', '^两只大型卷尾铜兽', '→',
  '^喷泉声、少数民族音乐和西洋音乐', '^将拍摄的四张图片', '^就在这时，小程序',
  '^在屏幕上按走过的顺序', '^拼错的地方', '^把最后一块推到中间', '^输入密码，点击确认',
  '^请前往', '^跟随小程序', '^全部归位后', '^打开小程序。', '^展开$', '^西洋楼在圆明三园中',
  '^小程序弹出图片', '^小程序提示', '^[A-Fa-f][.、．]', '^[abcd]\\s',
  '^考察记录生成完成', '^《西洋楼铜版图·第二十一图》', '^绘制者：', '^绘制日期：', '^版本编号：',
  '^这是复玩的理由', '^玩家昨天在找一套画', '^一、', '^二、', '^三、', '^四、', '^五、',
  '^彩蛋：', '^温馨提示', '^点击按钮显示', '^小程序显示', '^小程序提醒', '^小程序中喷泉',
  '^谜题提示', '^谜题答案', '^提示：', '^日记和信封会指引', '^下一站：'
].join('|'))

function readDoc() {
  const raw = fs.readFileSync(DOC, 'utf8')
  const start = raw.indexOf('# 正文')
  if (start < 0) throw new Error('文档缺少 # 正文 锚点')
  let body = raw.slice(start)
  for (const [from, to] of MANUAL_EQUIV) body = body.split(from).join(to)
  return body
}

function stripMd(s, strict) {
  let out = s
    .replace(/<callout[^>]*>/g, '').replace(/<\/callout>/g, '')
    .replace(/<table[\s\S]*?<\/table>/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/【时间卡】/g, '时间卡')
    .replace(/【[^】]*】？?/g, '')
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/^>\s?/gm, '')
  // 严格模式保留空格（逐字节口径）；锚点剥除后残留的句首冒号（如【谜题提示】：）剥掉
  if (strict) return out.replace(/(^|\n)：/g, '$1')
  return out.replace(/[ \t　]+/g, '')
}

function norm(s) {
  return String(s)
    .replace(/[“”"„‟]/g, '"').replace(/[‘’']/g, "'")
    .replace(/[\s　]+/g, '')
}

// --strict：逐字节口径——不统一引号、不去空格、句末标点敏感。
// 仍有意的例外：挂点锚【】剥除（含 DJ/SL 编号，非上屏文字）、设计注记行不参与。
function normStrict(s) {
  return String(s).replace(/[\r\n]+/g, '')
}

function docSentences(strict) {
  const text = stripMd(readDoc(), strict)
  const out = []
  for (let line of text.split('\n')) {
    line = strict ? line.replace(/^\s+|\s+$/g, '') : line.trim()
    if (!line || line.length < 4) continue
    if (DOC_SKIP.test(line)) continue
    out.push(line)
  }
  return out
}

function stringLiterals(src) {
  const out = []
  // 支持单/双引号与模板字符串，内容里可含另一类引号（如 '"闻有第二十一图，未见。"'）
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g
  let m
  while ((m = re.exec(src))) out.push(m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : m[3]))
  return out
}

// 拼接语料过滤：只剥纯小写 ascii 键/路径/id（sl17、tap、/plate21/...），
// 保留「。」等纯标点片段（gloss parts 的收尾声节）与其余中文
function isJoinable(lit) {
  return !/^[a-z0-9\-_.\/:]+$/.test(lit)
}

function buildCorpus() {
  let raw = ''
  let joined = ''
  for (const rel of MAINLINE_FILES) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8')
    raw += src + '\n'
    joined += stringLiterals(src).filter(isJoinable).join('') + '\n'
    if (rel.endsWith('.wxml')) {
      const re2 = />([^<>{}\n]*[一-鿿][^<>{}\n]*)</g
      let m
      while ((m = re2.exec(src))) joined += m[1].trim()
      joined += '\n'
    }
  }
  return { raw: norm(raw), joined: norm(joined) }
}

// 严格口径语料：保引号保空格（仅去换行）
function buildCorpusStrict() {
  let raw = ''
  let joined = ''
  for (const rel of MAINLINE_FILES) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8')
    raw += src + '\n'
    joined += stringLiterals(src).filter(isJoinable).join('') + '\n'
    if (rel.endsWith('.wxml')) {
      const re2 = />([^<>{}\n]*[一-鿿][^<>{}\n]*)</g
      let m
      while ((m = re2.exec(src))) joined += m[1].trim()
      joined += '\n'
    }
  }
  return { raw: normStrict(raw), joined: normStrict(joined) }
}

function appStrings() {
  const results = []
  for (const rel of MAINLINE_FILES) {
    let src = fs.readFileSync(path.join(ROOT, rel), 'utf8')
    if (rel.endsWith('waypoint/waypoint.js')) {
      // 支线散页站点段落不查反向（保留给顺路散页的可选内容）
      for (const key of SIDE_SITE_KEYS) {
        const start = src.indexOf('  ' + key + ': {')
        if (start < 0) continue
        let end = src.length
        for (const k of ['yangquelong', 'fangwaiguan', 'xushuilou', 'guanshuifa', 'xianfahua']) {
          if (k === key) continue
          const idx = src.indexOf('  ' + k + ': {', start + 1)
          if (idx > start && idx < end) end = idx
        }
        src = src.slice(0, start) + '\n' + src.slice(end)
      }
    }
    for (const t of stringLiterals(src)) {
      const tt = t.trim()
      if (tt.length >= 10 && /[，。！？：]/.test(tt) && /[一-鿿]/.test(tt)) results.push({ file: rel, text: tt })
    }
    if (rel.endsWith('.wxml')) {
      const re2 = />([^<>{}\n]*[一-鿿][^<>{}\n]*)</g
      let m
      while ((m = re2.exec(src))) {
        const tt = m[1].trim()
        if (tt.length >= 10 && /[，。！？：]/.test(tt)) results.push({ file: rel, text: tt })
      }
    }
  }
  return results
}

function inCorpus(corpus, clause) {
  const c = norm(clause)
  if (corpus.raw.includes(c) || corpus.joined.includes(c)) return true
  const trimmed = c.replace(/[。！？；：]$/, '')
  return trimmed.length >= 4 && (corpus.raw.includes(trimmed) || corpus.joined.includes(trimmed))
}

function main() {
  const verbose = process.argv.includes('--verbose')
  const strict = process.argv.includes('--strict')
  const corpus = strict ? buildCorpusStrict() : buildCorpus()
  const docText = stripMd(readDoc(), strict)
  const docNorm = strict ? normStrict(docText) : norm(docText)
  const docSents = docSentences(strict)

  const missing = []
  for (const sent of docSents) {
    const clauses = sent.split(/(?<=[。！？；])/).map(s => s.trim()).filter(s => s.length >= 4)
    for (const c of clauses) {
      if (DOC_SKIP.test(c)) continue
      if (strict) {
        // 逐字节：不做句末标点豁免、不做 ：再拆
        const cs = normStrict(c)
        if (!corpus.raw.includes(cs) && !corpus.joined.includes(cs)) missing.push(c)
        continue
      }
      if (inCorpus(corpus, c)) continue
      // 长句在 UI 里常被引用块/插图/挂点分段：按 ：再拆，逐段核对
      const segs = c.split('：').map(s => s.trim()).filter(s => s.length >= 4)
      const missSegs = segs.filter(s => !inCorpus(corpus, s))
      if (missSegs.length) missing.push(missSegs.join(' ／ （出自）' + c.slice(0, 50)))
    }
  }

  const extras = []
  if (!strict) {
    for (const item of appStrings()) {
      const t = norm(item.text)
      if (docNorm.includes(t)) continue
      if (BACKWARD_EXEMPT.some(x => t.includes(norm(x)))) continue
      extras.push(item)
    }
  }

  console.log('== 正向（飞书剧情 → 小程序缺失）' + (strict ? '【逐字节】' : '') + ':', missing.length)
  missing.forEach(m => console.log('  [缺]', m))
  if (!strict) {
    console.log('== 反向（小程序叙述 → 飞书无出处）:', extras.length)
    if (verbose) extras.forEach(e => console.log('  [多]', e.file + ':', e.text.slice(0, 90)))
    else extras.slice(0, 80).forEach(e => console.log('  [多]', e.file + ':', e.text.slice(0, 70)))
  }
  console.log('== 文档剧情句:', docSents.length)
  process.exit(missing.length === 0 && extras.length === 0 ? 0 : 1)
}

main()
