const assert = require('node:assert/strict')
const test = require('node:test')

const { buildProgress } = require('../plate21/module/progress/build')
const { PLAY_IDS, SITE_IDS } = require('../plate21/module/flow/contract')

function row(view, id) {
  return view.rows.find((item) => item.id === id)
}

function puzzle(view, playId) {
  for (const item of view.rows) {
    const found = item.puzzles.find((entry) => entry.playId === playId)
    if (found) return found
  }
  return undefined
}

test('跳过 xieqiqu 时该行是这次没去，openPageId 为 M1', () => {
  const view = buildProgress({
    pageId: 'M2',
    sites: { xieqiqu: 'skipped' },
    puzzles: {}
  })
  assert.equal(row(view, 'xieqiqu').state, '这次没去')
  assert.equal(view.openPageId('xieqiqu'), 'M1')
})

test('H5 的题 skipped 时状态是跳过，reopenPageId 为 H5', () => {
  const view = buildProgress({
    pageId: 'M3',
    sites: { maze: 'done' },
    puzzles: { 'quiz-pattern': 'skipped' }
  })
  const pattern = puzzle(view, 'quiz-pattern')
  assert.equal(pattern.state, '跳过')
  assert.equal(pattern.reopenPageId, 'H5')
  assert.equal(view.openPageId('maze', 'quiz-pattern'), 'H5')
})

test('缺省 sites / puzzles 当 idle / pending', () => {
  const view = buildProgress({ pageId: 'P2' })
  assert.equal(row(view, 'prologue').state, '进行中')
  assert.equal(row(view, 'gate').state, '还没到')
  assert.equal(row(view, 'xieqiqu').state, '还没到')
  assert.equal(puzzle(view, 'quiz-direction').state, '未做')
  assert.equal(puzzle(view, 'quiz-pattern').state, '未做')
  assert.equal(puzzle(view, 'place-animals').state, '未做')
})

test('序章：P 开头进行中，到 E1 或更后已看完', () => {
  assert.equal(row(buildProgress({ pageId: 'P1' }), 'prologue').state, '进行中')
  assert.equal(row(buildProgress({ pageId: 'P3' }), 'prologue').state, '进行中')
  assert.equal(row(buildProgress({ pageId: 'E1' }), 'prologue').state, '已看完')
  assert.equal(row(buildProgress({ pageId: 'HG1' }), 'prologue').state, '已看完')
  assert.equal(row(buildProgress({ pageId: 'LT1' }), 'prologue').state, '已看完')
  assert.equal(row(buildProgress({}), 'prologue').state, '还没到')
})

test('点位：在站内是进行中，done 已看完，skipped 这次没去，active 进行中', () => {
  const onPage = buildProgress({ pageId: 'F2', sites: { fangwaiguan: 'done' } })
  assert.equal(row(onPage, 'fangwaiguan').state, '进行中')

  const skippedHere = buildProgress({ pageId: 'X1', sites: { xieqiqu: 'skipped' } })
  assert.equal(row(skippedHere, 'xieqiqu').state, '进行中')

  const done = buildProgress({ pageId: 'M4', sites: { gate: 'done', fangwaiguan: 'skipped' } })
  assert.equal(row(done, 'gate').state, '已看完')
  assert.equal(row(done, 'fangwaiguan').state, '这次没去')
  assert.equal(row(done, 'haiyantang').state, '进行中')

  const active = buildProgress({ pageId: 'P1', sites: { hugo: 'active' } })
  assert.equal(row(active, 'hugo').state, '进行中')
})

test('八个点回到走路页或入口页', () => {
  const view = buildProgress({ pageId: 'P1' })
  assert.equal(view.openPageId('gate'), 'E1')
  assert.equal(view.openPageId('xieqiqu'), 'M1')
  assert.equal(view.openPageId('maze'), 'M2')
  assert.equal(view.openPageId('fangwaiguan'), 'M3')
  assert.equal(view.openPageId('haiyantang'), 'M4')
  assert.equal(view.openPageId('xushuilou'), 'M5')
  assert.equal(view.openPageId('dashuifa'), 'M6')
  assert.equal(view.openPageId('hugo'), 'M7')
  assert.equal(view.openPageId('prologue'), 'P1')
  assert.equal(view.openPageId('finale'), 'FN1')
  assert.equal(view.openPageId('letter'), 'LT1')
})

test('重开题页号按玩法编号，不跟走路页走', () => {
  const view = buildProgress({ pageId: 'P1', puzzles: {} })
  const expected = {
    'quiz-direction': 'E1',
    'listen-nfc': 'X1',
    'quiz-envelope': 'X2',
    'quiz-lantern': 'H1',
    'prop-flip': 'H3',
    'photo-pavilion': 'H4',
    'quiz-pattern': 'H5',
    'quiz-hour': 'HY1',
    'prop-dial': 'HY3',
    'quiz-height': 'XS1',
    'place-animals': 'DS1'
  }
  for (const playId of Object.keys(expected)) {
    const entry = puzzle(view, playId)
    assert.equal(entry.reopenPageId, expected[playId], playId)
    assert.equal(view.openPageId('maze', playId), expected[playId], playId)
  }
  assert.equal(view.openPageId('xieqiqu', 'listen-nfc'), 'X1')
  assert.equal(view.openPageId('xieqiqu'), 'M1')
})

test('结局看 FN / LT，不看 signedAt；次日信在 FN4 还没到', () => {
  const signing = buildProgress({
    pageId: 'FN4',
    signedAt: 1,
    sites: { hugo: 'done' },
    puzzles: {}
  })
  assert.equal(row(signing, 'finale').state, '进行中')
  assert.equal(row(signing, 'letter').state, '还没到')
  assert.equal(row(signing, 'hugo').state, '已看完')

  const earlier = buildProgress({ pageId: 'FN1', signedAt: 1 })
  assert.equal(row(earlier, 'finale').state, '进行中')
  assert.equal(row(earlier, 'letter').state, '还没到')

  const letter = buildProgress({ pageId: 'LT2', signedAt: 1 })
  assert.equal(row(letter, 'finale').state, '已看完')
  assert.equal(row(letter, 'letter').state, '进行中')
})

test('题的完成与未做，方外观和雨果没有题', () => {
  const view = buildProgress({
    pageId: 'DS1',
    puzzles: {
      'quiz-hour': 'solved',
      'prop-dial': 'pending',
      'place-animals': 'solved'
    }
  })
  assert.equal(puzzle(view, 'quiz-hour').state, '完成')
  assert.equal(puzzle(view, 'prop-dial').state, '未做')
  assert.equal(puzzle(view, 'place-animals').state, '完成')
  assert.equal(puzzle(view, 'place-animals').reopenPageId, 'DS1')
  assert.deepEqual(row(view, 'fangwaiguan').puzzles, [])
  assert.deepEqual(row(view, 'hugo').puzzles, [])
  assert.deepEqual(row(view, 'prologue').puzzles, [])
  assert.deepEqual(row(view, 'finale').puzzles, [])
  assert.deepEqual(row(view, 'letter').puzzles, [])
})

test('行顺序、短标题，且不带剧情句', () => {
  const pages = {
    X1: {
      id: 'X1',
      siteId: 'xieqiqu',
      playId: 'listen-nfc',
      lines: ['PLOT-SENTENCE']
    }
  }
  const view = buildProgress({ pageId: 'X1', sites: {}, puzzles: {} }, pages)
  assert.deepEqual(view.rows.map((item) => item.id), [
    'prologue', ...SITE_IDS, 'finale', 'letter'
  ])
  assert.deepEqual(view.rows.map((item) => item.title), [
    '序章',
    '西洋楼入口',
    '谐奇趣',
    '黄花阵',
    '方外观',
    '海晏堂',
    '蓄水楼',
    '大水法',
    '雨果雕像',
    '结局',
    '次日信'
  ])
  assert.equal(row(view, 'xieqiqu').state, '进行中')
  const packed = JSON.stringify(view.rows)
  assert.equal(packed.includes('PLOT-SENTENCE'), false)
  for (const item of view.rows) {
    assert.deepEqual(Object.keys(item), ['id', 'title', 'state', 'puzzles'])
    for (const entry of item.puzzles) {
      assert.deepEqual(Object.keys(entry), ['playId', 'state', 'reopenPageId'])
    }
  }
})

test('pagesById 的 siteId 与 playId 覆盖缺省页号', () => {
  const pages = {
    M1: { id: 'M1', siteId: '', kind: 'nav' },
    Q9: { id: 'Q9', siteId: 'maze', playId: 'quiz-pattern' }
  }
  const view = buildProgress({
    pageId: 'M1',
    sites: { xieqiqu: 'skipped', maze: 'done' },
    puzzles: { 'quiz-pattern': 'solved' }
  }, pages)
  assert.equal(row(view, 'xieqiqu').state, '这次没去')
  assert.equal(view.openPageId('xieqiqu'), 'M1')

  const there = buildProgress({
    pageId: 'Q9',
    sites: { maze: 'done' },
    puzzles: { 'quiz-pattern': 'solved' }
  }, pages)
  assert.equal(row(there, 'maze').state, '进行中')
  assert.equal(puzzle(there, 'quiz-pattern').state, '完成')
  assert.equal(puzzle(there, 'quiz-pattern').reopenPageId, 'Q9')
  assert.equal(there.openPageId('maze', 'quiz-pattern'), 'Q9')
})

test('十一道题都挂在对应的点上，且不改入参', () => {
  const run = { pageId: 'E2', sites: { gate: 'active' }, puzzles: { 'quiz-direction': 'solved' } }
  const view = buildProgress(run)
  const seen = view.rows.flatMap((item) => item.puzzles.map((entry) => entry.playId))
  assert.deepEqual(seen, [...PLAY_IDS])
  assert.equal(row(view, 'gate').puzzles[0].playId, 'quiz-direction')
  assert.equal(row(view, 'xieqiqu').puzzles.map((entry) => entry.playId).join(','), 'listen-nfc,quiz-envelope')
  assert.deepEqual(run, {
    pageId: 'E2',
    sites: { gate: 'active' },
    puzzles: { 'quiz-direction': 'solved' }
  })
  assert.equal(view.openPageId('missing'), '')
  assert.equal(view.openPageId('gate', 'missing'), '')
})
