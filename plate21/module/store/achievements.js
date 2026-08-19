/**
 * 成就系统 —— 规则驱动的事件订阅。
 * 订阅 session 事件流（puzzle/station/arrived/completed），每次事件按当前快照
 * 评估全部规则；新解锁的成就经 set_flag('achievements.<id>') 幂等落库，
 * 再发 achievement_unlocked 埋点并通知 UI（overlay-host 印章 toast）。
 *
 * 不反向依赖 session：由 session 加载完成后调用 attach(sessionApi) 注入。
 * 重置会话后 flags 清空，成就会随新一局重新解锁。
 */
'use strict'

const RULES = [
  {
    id: 'first-envelope', title: '初拆信封', desc: '拆开那封没有署名的信',
    when: (snap) => !!(snap.puzzles && snap.puzzles['prologue-envelope'])
  },
  {
    id: 'decode-s1', title: '破译半字', desc: '从信封半字中破译出第一站',
    when: (snap) => !!(snap.puzzles && snap.puzzles['s1-decode'])
  },
  {
    id: 'four-photos', title: '四图全拍', desc: '在中心亭留下四张现场照片',
    when: (snap) => !!(snap.puzzles && snap.puzzles['s2-blend'])
  },
  {
    id: 'four-stations', title: '四站全通', desc: '走完西洋楼的四站考察',
    when: (snap) => {
      const s = snap.stations || {}
      return !!(s.s1 && s.s2 && s.s3 && s.s4)
    }
  },
  {
    id: 'timeline-perfect', title: '一次全对', desc: '时间轴第一次排列就完全正确',
    when: (snap) => {
      const p = snap.puzzles && snap.puzzles['s4-timeline']
      return !!(p && p.payload && Number(p.payload.attempts) === 1)
    }
  },
  {
    id: 'journey-done', title: '考察完成', desc: '为第二十一图落下署名',
    when: (snap) => !!(snap.flags && snap.flags.experienceCompletedAt)
  }
]

let sessionApi = null
// 仅抑制「落库在途」的重复触发；不作为长期缓存，重置后可再次解锁。
const pendingUnlock = {}
const uiListeners = []

function attach(api) {
  if (!api || sessionApi === api) return
  sessionApi = api
  sessionApi.onEvent(handleEvent)
}

function handleEvent() {
  evaluate()
}

function evaluate() {
  if (!sessionApi) return
  const snap = sessionApi.getSnapshot()
  if (!snap) return
  const flags = snap.flags || {}
  for (const rule of RULES) {
    if (flags['achievements.' + rule.id] || pendingUnlock[rule.id]) continue
    let passed = false
    try { passed = rule.when(snap) } catch (e) { passed = false }
    if (!passed) continue
    unlock(rule)
  }
}

function unlock(rule) {
  pendingUnlock[rule.id] = true
  sessionApi.setFlag('achievements.' + rule.id, Date.now())
    .catch((err) => {
      console.warn('[plate21] 成就落库失败', rule.id, err && err.message)
    })
    .then(() => { delete pendingUnlock[rule.id] })
  try {
    sessionApi.emit({ name: 'achievement_unlocked', achievement: rule.id, title: rule.title })
  } catch (e) {}
  uiListeners.forEach((fn) => {
    try { fn(rule) } catch (e) {}
  })
}

function onUnlock(fn) {
  uiListeners.push(fn)
}

// 手册展示：全部规则 + 解锁状态。
function list(snap) {
  const flags = (snap && snap.flags) || {}
  return RULES.map((rule) => ({
    id: rule.id,
    title: rule.title,
    desc: rule.desc,
    unlocked: !!flags['achievements.' + rule.id] || !!pendingUnlock[rule.id]
  }))
}

module.exports = {
  RULES,
  attach,
  evaluate,
  onUnlock,
  list
}
