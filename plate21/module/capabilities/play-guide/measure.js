/**
 * 同一套坐标：一次 query 量目标 + 页面可视区域（selectViewport）。
 * 红框用「相对可视区域左上角」的 px，不用 getWindowInfo 的理论宽高。
 */
const RETRIES = 6
const GAP_MS = 50

function measureIn(scope, selector) {
  return new Promise(function (resolve) {
    function once(n) {
      let q
      try {
        q = wx.createSelectorQuery()
      } catch (err) {
        resolve(null)
        return
      }
      const bound = scope && q.in ? q.in(scope) : q
      const chain = bound.select(selector).boundingClientRect()
      if (typeof chain.selectViewport !== 'function') {
        if (n + 1 < RETRIES) setTimeout(function () { once(n + 1) }, GAP_MS)
        else resolve(null)
        return
      }
      try {
        chain
          .selectViewport()
          .boundingClientRect()
          .exec(function (res) {
            const node = res && res[0]
            const view = res && res[1]
            if (node && node.width > 0 && node.height > 0 && view && view.width > 0) {
              resolve({
                hole: {
                  top: node.top - (view.top || 0),
                  left: node.left - (view.left || 0),
                  width: node.width,
                  height: node.height
                },
                win: {
                  top: view.top || 0,
                  left: view.left || 0,
                  windowWidth: view.width,
                  windowHeight: view.height
                }
              })
              return
            }
            if (n + 1 < RETRIES) {
              setTimeout(function () { once(n + 1) }, GAP_MS)
            } else {
              resolve(null)
            }
          })
      } catch (err) {
        if (n + 1 < RETRIES) setTimeout(function () { once(n + 1) }, GAP_MS)
        else resolve(null)
      }
    }
    if (wx.nextTick) wx.nextTick(function () { once(0) })
    else setTimeout(function () { once(0) }, 0)
  })
}

/**
 * 气泡贴在镂空钮旁边，不估高度：
 * 钮在下半屏 → CSS bottom 钉在钮上沿再往上长；
 * 钮在上半屏 → CSS top 钉在钮下沿再往下长。
 * 这样实际气泡多高都压不到镂空。
 */
function bubbleStyle(left, width, above, top, bottom, maxHeight) {
  const base = 'left:' + left + 'px;width:' + width + 'px;max-height:' + maxHeight + 'px;'
  return above
    ? base + 'bottom:' + bottom + 'px;top:auto;'
    : base + 'top:' + top + 'px;bottom:auto;'
}

function layoutBubble(vp, hole, hasNames) {
  const w = (vp && vp.w) || 375
  const hgt = (vp && vp.h) || 812
  const width = Math.min(hasNames ? 300 : 280, Math.max(120, w - 24))
  const gap = 10
  const edge = 8
  if (!hole || !(hole.width > 0) || !(hole.height > 0)) {
    const bottom = 88
    const maxHeight = Math.max(120, hgt - bottom - edge)
    const left = Math.max(12, (w - width) / 2)
    return {
      top: Math.max(edge, hgt - 220),
      left: left,
      width: width,
      above: true,
      bottom: bottom,
      maxHeight: maxHeight,
      style: bubbleStyle(left, width, true, 0, bottom, maxHeight)
    }
  }
  const holeBottom = hole.top + hole.height
  const spaceAbove = hole.top
  const spaceBelow = hgt - holeBottom
  const above = spaceAbove >= spaceBelow
  let left = hole.left
  if (left + width > w - 12) left = w - 12 - width
  if (left < 12) left = 12
  if (above) {
    const bottom = Math.max(edge, hgt - hole.top + gap)
    const maxHeight = Math.max(96, hole.top - gap - edge)
    return {
      top: 0,
      left: left,
      width: width,
      above: true,
      bottom: bottom,
      maxHeight: maxHeight,
      style: bubbleStyle(left, width, true, 0, bottom, maxHeight)
    }
  }
  const top = holeBottom + gap
  const maxHeight = Math.max(96, hgt - top - edge)
  return {
    top: top,
    left: left,
    width: width,
    above: false,
    bottom: 0,
    maxHeight: maxHeight,
    style: bubbleStyle(left, width, false, top, 0, maxHeight)
  }
}

module.exports = { measureIn: measureIn, layoutBubble: layoutBubble }
