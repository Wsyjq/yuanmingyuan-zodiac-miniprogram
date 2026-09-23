/**
 * 前人明信片 · 本地种子池（无后端时的降级数据）。
 * 权威口径见 docs/方案设计-回响-明信片流转-解说词分层-v2对齐.md §2.4：
 * 「一张，不是一堆」——同一会话在同一站固定读到同一张。
 * 接入后端后由 adapter 从真实留言池取单张替换；本池仅保证机制先完整可玩。
 */
'use strict'

const SEED_POSTCARDS = [
  { text: '在它被人记得的地方。哪怕只剩一个名字。', from: '一位考察者' },
  { text: '放在有人愿意为它停下来的地方。', from: '一位考察者' },
  { text: '我不确定。我把这个问题带回家了。', from: '一位考察者' },
  { text: '在被看着的时候。没人看，放得再好也没用。', from: '一位考察者' },
  { text: '石鱼的答案：在别人的湖里，也还在水里。', from: '一位考察者' },
  { text: '放在还愿意讲它的地方。', from: '一位考察者' },
  { text: '我原来以为是在原处。现在不确定了。', from: '一位考察者' },
  { text: '放在下一个愿意打开它的人手里。', from: '一位考察者' }
]

// 确定性取张：同一 seedKey 永远取到同一张（重看不换、刷新不变）。
function pickPostcard(seedKey) {
  const key = String(seedKey || '')
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return SEED_POSTCARDS[hash % SEED_POSTCARDS.length]
}

module.exports = {
  SEED_POSTCARDS: SEED_POSTCARDS,
  pickPostcard: pickPostcard
}
