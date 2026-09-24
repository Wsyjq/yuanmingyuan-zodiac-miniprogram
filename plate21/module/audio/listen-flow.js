'use strict'
// Automatic progression is limited to narration, never arrival or gameplay.
function eligible(data) {
  return data.listenMode === 'listen' && data.voiceEnabled && data.pageVisible &&
    !data.loading && !data.busy && !data.drawer && !data.restartScreen && !data.showModeChoice &&
    !data.review && !data.error && data.screen && !data.screen.locked &&
    data.screen.screenPart === 'story' && ['nav', 'sign'].indexOf(data.screen.kind) < 0 &&
    data.narrClips && data.narrClips.length > 0
}
function createCountdown({ set = setTimeout, clear = clearTimeout, valid, update, advance }) {
  let timer = null, generation = 0
  function cancel() { generation++; if (timer !== null) clear(timer); timer = null; update(0) }
  function start() {
    cancel()
    if (!valid()) return
    const token = generation
    let remaining = 3
    update(remaining)
    function tick() {
      if (token !== generation) return
      if (!valid()) { cancel(); return }
      remaining--
      update(remaining)
      if (!remaining) { timer = null; generation++; advance(); return }
      timer = set(tick, 1000)
    }
    timer = set(tick, 1000)
  }
  return { start, cancel }
}
module.exports = { eligible, createCountdown }
