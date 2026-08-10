const assert = require('node:assert/strict')
const test = require('node:test')

const { renderPage } = require('./harness/runtime')

const PAGES = [
  { route: 'pages/index/index' },
  { route: 'plate21/module/pages/cover/cover' },
  { route: 'plate21/module/pages/prologue/prologue' },
  { route: 'plate21/module/pages/s1-decode/s1-decode' },
  { route: 'plate21/module/pages/transit/transit', query: { leg: 's1-s2' } },
  { route: 'plate21/module/pages/s2-quiz/s2-quiz' },
  { route: 'plate21/module/pages/s2-reveal/s2-reveal' },
  { route: 'plate21/module/pages/s2-blend/s2-blend' },
  { route: 'plate21/module/pages/s2-pattern/s2-pattern' },
  { route: 'plate21/module/pages/s3-comic/s3-comic' },
  { route: 'plate21/module/pages/s3-zodiac/s3-zodiac' },
  { route: 'plate21/module/pages/s3-water/s3-water' },
  { route: 'plate21/module/pages/s4-timeline/s4-timeline' },
  { route: 'plate21/module/pages/s4-password/s4-password' },
  { route: 'plate21/module/pages/finale/finale' },
  { route: 'plate21/module/pages/report/report' },
  { route: 'plate21/module/pages/ending/ending' },
  { route: 'plate21/module/pages/handbook/handbook' }
]

for (const spec of PAGES) {
  test(`${spec.route} renders without lifecycle errors`, async () => {
    const result = await renderPage({
      route: spec.route,
      query: spec.query || {},
      settleMs: 20
    })
    assert.deepEqual(result.errors, [])
    assert.notEqual(result.html.trim(), '')
  })
}
