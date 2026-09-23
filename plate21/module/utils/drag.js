/**
 * 拖拽 helper —— s4-timeline（采风修订版）等拖拽页共用。
 *
 * 约定：
 * - 被拖元素 absolute 定位，left/top 单位为 rpx，相对页面根节点（页面 100vh 不滚动）。
 * - 触摸坐标统一用 clientX/clientY（viewport px），与 SelectorQuery.boundingClientRect 同坐标系。
 * - rpx ↔ px 换算：750rpx = 屏幕宽。
 *
 * API：
 *   var dragger = drag.create({ width: 120, height: 120 })   // 元素尺寸（rpx）
 *   dragger.start(e, { id: 0, x: 10, y: 20 })                // bindtouchstart；x/y 为元素当前 rpx 坐标
 *   var p = dragger.move(e)                                   // bindtouchmove  → { id, x, y }（rpx）| null
 *   var r = dragger.end(e)                                    // bindtouchend   → { id, x, y }（rpx）| null
 *   var i = drag.hitTest(r.x, r.y, w, h, rects, 40)           // 中心点命中判定 → 槽位下标 | -1
 *   drag.measure('.slot').then(function (rects) {})           // 量目标矩形（px，viewport 坐标）
 */

var _ratio = 0

/** px / rpx 换算比（px = rpx * ratio） */
function ratio() {
  if (!_ratio) {
    var info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    _ratio = info.windowWidth / 750
  }
  return _ratio
}

/**
 * 创建一个拖拽会话（单指、单元素；每页一个实例即可）。
 * @param {{width: number, height: number}} size 元素尺寸（rpx），仅用于调用方参考，命中判定见 hitTest
 */
function create(size) {
  var cur = null
  size = size || { width: 0, height: 0 }

  return {
    /** touchstart：记录起点与元素当前位置 */
    start: function (e, item) {
      var t = e.touches[0]
      cur = { id: item.id, sx: t.clientX, sy: t.clientY, ox: item.x, oy: item.y, x: item.x, y: item.y }
    },
    /** touchmove：返回元素新位置（rpx）；无活动拖拽返回 null */
    move: function (e) {
      if (!cur) return null
      var t = e.touches[0]
      cur.x = cur.ox + (t.clientX - cur.sx) / ratio()
      cur.y = cur.oy + (t.clientY - cur.sy) / ratio()
      return { id: cur.id, x: cur.x, y: cur.y }
    },
    /** touchend：返回元素最终位置（rpx）并结束会话 */
    end: function (e) {
      if (!cur) return null
      var t = (e.changedTouches && e.changedTouches[0]) || null
      if (t) {
        cur.x = cur.ox + (t.clientX - cur.sx) / ratio()
        cur.y = cur.oy + (t.clientY - cur.sy) / ratio()
      }
      var out = { id: cur.id, x: cur.x, y: cur.y }
      cur = null
      return out
    },
    /** 是否有活动拖拽 */
    active: function () {
      return !!cur
    }
  }
}

/**
 * 命中判定：元素中心点是否落入某个目标矩形。
 * @param {number} x 元素 left（rpx）
 * @param {number} y 元素 top（rpx）
 * @param {number} w 元素宽（rpx）
 * @param {number} h 元素高（rpx）
 * @param {Array<{left:number,top:number,width:number,height:number}>} rects 目标矩形（px，viewport 坐标）
 * @param {number} [toleranceRpx] 磁吸容差（rpx），矩形四边外扩
 * @returns {number} 命中的槽位下标，未命中 -1
 */
function hitTest(x, y, w, h, rects, toleranceRpx) {
  if (!rects || !rects.length) return -1
  var r = ratio()
  var cx = (x + w / 2) * r
  var cy = (y + h / 2) * r
  var tol = (toleranceRpx || 0) * r
  for (var i = 0; i < rects.length; i++) {
    var rc = rects[i]
    if (!rc) continue
    if (cx >= rc.left - tol && cx <= rc.left + rc.width + tol &&
        cy >= rc.top - tol && cy <= rc.top + rc.height + tol) {
      return i
    }
  }
  return -1
}

/**
 * 量一组目标元素的矩形（px，viewport 坐标；含滚动偏移，随取随用）。
 * @param {string} selector 如 '.slot'
 * @returns {Promise<Array>} boundingClientRect 数组，失败/为空返回 []
 */
function measure(selector) {
  return new Promise(function (resolve) {
    wx.createSelectorQuery()
      .selectAll(selector)
      .boundingClientRect(function (rects) {
        resolve(rects || [])
      })
      .exec()
  })
}

module.exports = {
  ratio: ratio,
  create: create,
  hitTest: hitTest,
  measure: measure
}
