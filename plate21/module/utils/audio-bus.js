/**
 * audio-bus —— 单路播放互斥（「独立控制」的运行时保障）。
 *
 * 规则：任意一路开播时，其余在播的全部暂停；这路结束/暂停后，
 * 被它压下去的氛围 BGM 自动恢复。注册方需实现 pause()/resume()。
 * 类别（kind）：'voice' 人声（台词/旁白/导览），'bgm' 氛围音乐；
 * 类别只影响恢复策略（人声完 → 还 BGM），不参与开关判断（开关归 audio-settings）。
 */
'use strict'

var players = []
var active = null
var mutedByActivate = []

function register(player) {
  if (players.indexOf(player) === -1) players.push(player)
}

function isActive(player) {
  return active === player
}

function unregister(player) {
  var i = players.indexOf(player)
  if (i !== -1) players.splice(i, 1)
  if (active === player) release()
}

// 开播前调用：其余在播的暂停（记住被压下的 BGM，供恢复）。
// 人声换手（A 还在播时 B 起播）不丢账：上一轮被压停的 BGM 继续记账。
function activate(player) {
  if (active === player) return
  active = player
  const carried = mutedByActivate
  mutedByActivate = []
  players.forEach(function (other) {
    if (other !== player && other.isPlaying && other.isPlaying()) {
      other.pause()
      if (other.kind === 'bgm') mutedByActivate.push(other)
    }
  })
  carried.forEach(function (bgm) {
    if (players.indexOf(bgm) !== -1 && mutedByActivate.indexOf(bgm) === -1) {
      mutedByActivate.push(bgm)
    }
  })
}

// 播放结束/暂停时调用：恢复被这路压下的氛围 BGM。
function release() {
  active = null
  var toResume = mutedByActivate
  mutedByActivate = []
  toResume.forEach(function (bgm) {
    try { bgm.resume() } catch (e) { /* 忽略单个恢复失败 */ }
  })
}

// 开关关闭时按类别急停（返回 true 表示该 player 属于该类别且被停了）。
function stopKind(kind) {
  players.forEach(function (p) {
    if (p.kind === kind && p.isPlaying && p.isPlaying()) {
      try { p.pause() } catch (e) { /* 忽略 */ }
    }
  })
}

module.exports = {
  register: register,
  unregister: unregister,
  activate: activate,
  release: release,
  isActive: isActive,
  stopKind: stopKind
}
