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
    id: 'first-envelope', title: '接过档案', desc: '接过那册没走完的档案',
    when: (snap) => !!(snap.puzzles && snap.puzzles['prologue-envelope'])
  },
  {
    id: 'decode-s1', title: '破译成功', desc: '从信封半字中拼出黄花阵',
    when: (snap) => !!(snap.puzzles && snap.puzzles['xq-next'])
  },
  {
    // V2.1 对读三改为「一处即算」，四图全拍降为厚记录的奖励性印记：
    // 仅当现场记录里四处细目都拍了才解锁。
    id: 'four-photos', title: '四图全拍', desc: '在中心亭留下四张现场照片',
    when: (snap) => {
      const record = snap.flags && snap.flags.s2PhotoRecord
      const photos = record && record.photos
      const keys = ['dome', 'beast', 'lotus', 'swan']
      return !!photos && keys.every((key) => !!photos[key])
    }
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
  },
  {
    // v2 顺路支线：谐奇趣/养雀笼/方外观/蓄水楼/大水法留白/线法画，走进至少三处。
    id: 'side-walker', title: '顺路人', desc: '顺路走进六处遗址中的至少三处',
    when: (snap) => {
      const f = snap.flags || {}
      // v2 顺路散页六处：谐奇趣/养雀笼/方外观/蓄水楼/观水法/线法画（大水法已转主线站）。
      const sites = ['xieqiqu', 'yangquelong', 'fangwaiguan', 'xushuilou', 'guanshuifa', 'xianfahua']
      return sites.filter((key) => !!f['sideVisited_' + key]).length >= 3
    }
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
