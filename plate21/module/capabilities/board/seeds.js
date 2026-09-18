/**
 * 考察者留言簿 · 本地种子池（无后端时的降级数据）。
 * 口径与 capabilities/audio-guide/postcards.js 一致：确定性选取——
 * 同一会话永远看到同一面留言墙（重看不换、刷新不变）。
 * 接入后端后由 adapter 从真实留言池取数替换；本池仅保证机制先完整可玩。
 * 文案红线：前人考察者口吻，短句、具体、不说教、不替读者编感受。
 */
'use strict'

const SEED_MESSAGES = [
  { text: '黄花阵走了两遍。第二遍才看清墙上的万字纹。', from: '一位考察者', date: '2026.08.30' },
  { text: '第八张日期卡对上的那一下，值回票价。', from: '一位考察者', date: '2026.08.28' },
  { text: '大水法那两分钟，记得抬头。', from: '一位考察者', date: '2026.09.02' },
  { text: '带一支笔。有些字，手机打不出来。', from: '一位考察者', date: '2026.08.25' },
  { text: '正午在喷泉旧址站了一会儿。十二个时辰，一个一个来的。', from: '一位考察者', date: '2026.09.05' },
  { text: '回去查了一晚上蒋友仁。他真的到过这儿。', from: '一位考察者', date: '2026.08.31' },
  { text: '线法画那站，从栏杆那儿往回看，画就成立了。', from: '一位考察者', date: '2026.09.01' },
  { text: '报告保存了。画得丑，但是我的。', from: '一位考察者', date: '2026.09.03' }
]

// 确定性取张：同一 seedKey 永远取到同一组（环形取 count 张，不重复）。
function pickBoardMessages(seedKey, count) {
  const key = String(seedKey || '')
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  const total = SEED_MESSAGES.length
  const start = hash % total
  const n = Math.min(Number(count) || total, total)
  const picked = []
  for (let i = 0; i < n; i++) {
    picked.push(SEED_MESSAGES[(start + i) % total])
  }
  return picked
}

module.exports = {
  SEED_MESSAGES: SEED_MESSAGES,
  pickBoardMessages: pickBoardMessages
}
