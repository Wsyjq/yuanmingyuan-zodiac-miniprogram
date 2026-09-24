'use strict'

// 主线页表只维护流程；正文来自 script-content.js 中的 Word 原稿逐段映射。
// 原文与显示去向见 test/fixtures/v3-script-coverage.json，不再按语气猜测并删掉正文。
// 去掉【】里的道具和史料编号。走路页的 siteId 是要去的站。skipTo 只给序章整段、走路页、谜题页。
// FN4.next 指向次日 LT1。当天应停在 FN4；要不要进 LT1 由调用方比较 signedAt，引擎不看日期。
// 彩蛋 LT6 查看上一位、LT7 留下文字/照片/心愿，走现有留言板。
// 未接投稿服务时只保留私人记录，不伪造审核状态或上一位游客。

const script = require('./script-content')
const NAV_MAP = '整页导航图'

function narrId(id, kind) {
  if (kind === 'nav' || id === 'FN4') return ''
  return 'narr-' + id.toLowerCase()
}

function page(spec) {
  const original = script.byPage[spec.id] || {}
  return {
    id: spec.id,
    kind: spec.kind,
    siteId: spec.siteId || '',
    lines: original.lines || spec.lines || [],
    beforeLines: original.beforeLines || [],
    answerLines: original.answerLines || [],
    signedLines: original.signedLines || [],
    sectionTitle: original.sectionTitle || '',
    narrId: narrId(spec.id, spec.kind),
    image: spec.image || '',
    propPrompt: spec.propPrompt || '',
    playId: spec.playId || '',
    revealOf: spec.revealOf || '',
    next: spec.next || '',
    skipTo: spec.skipTo || '',
    presentation: spec.presentation || null,
    relayLines: original.relayLines || spec.relayLines || []
  }
}

const list = [
  page({
    id: 'P1',
    kind: 'read',
    next: 'P2',
    skipTo: 'E1'
  }),
  page({
    id: 'P2',
    kind: 'read',
    next: 'P3',
    skipTo: 'E1'
  }),
  page({
    id: 'P3',
    kind: 'read',
    propPrompt: '打开档案袋、读日记',
    next: 'E1',
    skipTo: 'E1'
  }),
  page({
    id: 'E1',
    kind: 'puzzle',
    siteId: 'gate',
    propPrompt: '打开地图再做方位题',
    playId: 'quiz-direction',
    next: 'E2',
    skipTo: 'E2'
  }),
  page({
    id: 'E2',
    kind: 'read',
    siteId: 'gate',
    propPrompt: '袋里有铜版',
    next: 'M1'
  }),
  page({
    id: 'M1',
    kind: 'nav',
    siteId: 'xieqiqu',
    image: NAV_MAP,
    next: 'X1',
    skipTo: 'M2'
  }),
  page({
    id: 'X1',
    kind: 'puzzle',
    siteId: 'xieqiqu',
    propPrompt: '用音乐贴片',
    playId: 'listen-nfc',
    next: 'X2',
    skipTo: 'X2'
  }),
  page({
    id: 'X2',
    kind: 'puzzle',
    siteId: 'xieqiqu',
    propPrompt: '信封的封口处和信的背面都有一半的字，拼接起来看一下！',
    playId: 'quiz-envelope',
    next: 'X3',
    skipTo: 'M2'
  }),
  page({
    id: 'X3',
    kind: 'read',
    siteId: 'xieqiqu',
    revealOf: 'quiz-envelope',
    next: 'M2'
  }),
  page({
    id: 'M2',
    kind: 'nav',
    siteId: 'maze',
    image: NAV_MAP,
    next: 'H1',
    skipTo: 'M3'
  }),
  page({
    id: 'H1',
    kind: 'puzzle',
    siteId: 'maze',
    playId: 'quiz-lantern',
    next: 'H2',
    skipTo: 'H3'
  }),
  page({
    id: 'H2',
    kind: 'read',
    siteId: 'maze',
    revealOf: 'quiz-lantern',
    next: 'H3'
  }),
  page({
    id: 'H3',
    kind: 'puzzle',
    siteId: 'maze',
    propPrompt: '翻黄花阵图',
    playId: 'prop-flip',
    next: 'H4',
    skipTo: 'H4'
  }),
  page({
    id: 'H4',
    kind: 'puzzle',
    siteId: 'maze',
    image: '用户刚拍的照片',
    playId: 'photo-pavilion',
    next: 'H5',
    skipTo: 'H5'
  }),
  page({
    id: 'H5',
    kind: 'puzzle',
    siteId: 'maze',
    image: '四张浮雕照片',
    propPrompt: '选出看到的花纹',
    playId: 'quiz-pattern',
    next: 'H6',
    skipTo: 'M3'
  }),
  page({
    id: 'H6',
    kind: 'read',
    siteId: 'maze',
    revealOf: 'quiz-pattern',
    next: 'M3'
  }),
  page({
    id: 'M3',
    kind: 'nav',
    siteId: 'fangwaiguan',
    image: NAV_MAP,
    next: 'F1',
    skipTo: 'M4'
  }),
  page({
    id: 'F1',
    kind: 'read',
    siteId: 'fangwaiguan',
    next: 'F2'
  }),
  page({
    id: 'F2',
    kind: 'read',
    siteId: 'fangwaiguan',
    image: '容妃图，渐显',
    next: 'M4'
  }),
  page({
    id: 'M4',
    kind: 'nav',
    siteId: 'haiyantang',
    image: NAV_MAP,
    next: 'HY1',
    skipTo: 'M5'
  }),
  page({
    id: 'HY1',
    kind: 'puzzle',
    siteId: 'haiyantang',
    image: '十二时辰喷水示意',
    playId: 'quiz-hour',
    next: 'HY2',
    skipTo: 'HY3'
  }),
  page({
    id: 'HY2',
    kind: 'read',
    siteId: 'haiyantang',
    presentation: { kind: 'water-clock-finale' },
    revealOf: 'quiz-hour',
    next: 'HY3'
  }),
  page({
    id: 'HY3',
    kind: 'puzzle',
    siteId: 'haiyantang',
    propPrompt: '使用转盘',
    playId: 'prop-dial',
    next: 'M5',
    skipTo: 'M5'
  }),
  page({
    id: 'M5',
    kind: 'nav',
    siteId: 'xushuilou',
    image: NAV_MAP,
    next: 'XS1',
    skipTo: 'M6'
  }),
  page({
    id: 'XS1',
    kind: 'puzzle',
    siteId: 'xushuilou',
    propPrompt: '看特刊',
    playId: 'quiz-height',
    next: 'XS2',
    skipTo: 'M6'
  }),
  page({
    id: 'XS2',
    kind: 'read',
    siteId: 'xushuilou',
    revealOf: 'quiz-height',
    next: 'M6'
  }),
  page({
    id: 'M6',
    kind: 'nav',
    siteId: 'dashuifa',
    image: NAV_MAP,
    next: 'DS1',
    skipTo: 'M7'
  }),
  page({
    id: 'DS1',
    kind: 'puzzle',
    siteId: 'dashuifa',
    propPrompt: '对照《大水法南面》',
    playId: 'place-animals',
    next: 'DS2',
    skipTo: 'M7'
  }),
  page({
    id: 'DS2',
    kind: 'read',
    siteId: 'dashuifa',
    revealOf: 'place-animals',
    next: 'M7'
  }),
  page({
    id: 'M7',
    kind: 'nav',
    siteId: 'hugo',
    image: NAV_MAP,
    next: 'HG1',
    skipTo: 'FN1'
  }),
  page({
    id: 'HG1',
    kind: 'read',
    siteId: 'hugo',
    next: 'FN1'
  }),
  page({
    id: 'FN1',
    kind: 'read',
    presentation: { kind: 'engraving-reveal', cue: '暗场后铜版风格画面渐显' },
    image: '第二十一图',
    next: 'FN2'
  }),
  page({
    id: 'FN2',
    kind: 'read',
    next: 'FN3'
  }),
  page({
    id: 'FN3',
    kind: 'read',
    presentation: { kind: 'archive-reveal', cue: '正文结束后显示作品预览' },
    next: 'FN4'
  }),
  page({
    id: 'FN4',
    kind: 'sign',
    next: 'LT1'
  }),
  page({
    id: 'LT1',
    kind: 'letter',
    next: 'LT2'
  }),
  page({
    id: 'LT2',
    kind: 'letter',
    next: 'LT3'
  }),
  page({
    id: 'LT3',
    kind: 'letter',
    next: 'LT4'
  }),
  page({
    id: 'LT4',
    kind: 'letter',
    next: 'LT5'
  }),
  page({
    id: 'LT5',
    kind: 'letter',
    next: 'LT6'
  }),
  page({
    id: 'LT6',
    kind: 'letter',
    next: 'LT7'
  }),
  page({
    id: 'LT7',
    kind: 'letter',
    next: 'LT8'
  }),
  page({
    id: 'LT8',
    kind: 'letter',
    lines: [
      '至于“第二十一图”究竟在哪里——',
      '我想，你现在应该已经不需要老夫告诉你答案了。',
      '这份档案还会继续传下去。',
      '所以，还请替老夫保守这个关于第廿一图的秘密。'
    ]
  })
]

const byId = {}
for (let i = 0; i < list.length; i++) byId[list[i].id] = list[i]

module.exports = {
  byId: byId,
  list: list
}
