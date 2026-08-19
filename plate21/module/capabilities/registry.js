/**
 * 能力注册表 —— 路由 → 页面级扩展能力（地图 / 语音导览 / 未来的 AR 等）。
 *
 * 新增页面只需在本表登记一行即可获得全部已激活能力；
 * overlay-host 组件按本表渲染对应的悬浮入口，页面自身逻辑零改动。
 */
'use strict'

const ROUTE_CAPABILITIES = {
  'pages/s1-decode/s1-decode': { map: true },
  'pages/transit/transit': { map: true },
  'pages/s2-quiz/s2-quiz': { map: true, audio: 's2' },
  'pages/s2-reveal/s2-reveal': { map: true, audio: 's2' },
  'pages/s2-blend/s2-blend': { map: true, audio: 's2' },
  'pages/s2-pattern/s2-pattern': { map: true, audio: 's2' },
  'pages/s3-comic/s3-comic': { map: true, audio: 's3' },
  'pages/s3-zodiac/s3-zodiac': { map: true, audio: 's3' },
  'pages/s3-water/s3-water': { map: true, audio: 's3' },
  'pages/s4-timeline/s4-timeline': { map: true, audio: 's4' },
  'pages/s4-password/s4-password': { map: true, audio: 's4' }
}

const FEATURE_FLAGS = {
  map: true,
  audio: true,
  // 到场打卡（geofence）：遗址公园 GPS 漂移较大，默认关闭，运营实测后再开。
  geofenceCheckin: false
}

// 地图导航提供方：'native' = wx.openLocation 拉起微信内置地图；
// 'tencent-plugin' 预留给腾讯地图插件，接入时在 site-geo 内实现同名接口即可，页面零改动。
const MAP_PROVIDER = 'native'

function capabilitiesFor(route) {
  const caps = ROUTE_CAPABILITIES[route] || {}
  return {
    map: !!(FEATURE_FLAGS.map && caps.map),
    audio: FEATURE_FLAGS.audio ? caps.audio || null : null
  }
}

function isGeofenceCheckinEnabled() {
  return FEATURE_FLAGS.geofenceCheckin
}

function setGeofenceCheckin(enabled) {
  FEATURE_FLAGS.geofenceCheckin = !!enabled
}

function mapProvider() {
  return MAP_PROVIDER
}

module.exports = {
  ROUTE_CAPABILITIES,
  capabilitiesFor,
  isGeofenceCheckinEnabled,
  setGeofenceCheckin,
  mapProvider
}
