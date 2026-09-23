/**
 * 西洋楼四站地理配置（gcj02）+ 距离计算 + 导航 provider 封装。
 * 坐标为公开地图近似值，正式运营前需现场校准后只改这一处。
 */
'use strict'

const registry = require('../registry')

const SITES = [
  { id: 's1', station: 's1', name: '西洋楼景区入口', latitude: 40.00702, longitude: 116.30653 },
  { id: 's2', station: 's2', name: '黄花阵', latitude: 40.0072, longitude: 116.30892 },
  { id: 's3', station: 's3', name: '海晏堂 · 大水法', latitude: 40.00628, longitude: 116.31235 },
  { id: 's4', station: 's4', name: '雨果雕像', latitude: 40.0059, longitude: 116.31218 }
]

const EARTH_RADIUS = 6371000

function distanceMeters(a, b) {
  const rad = Math.PI / 180
  const dLat = (b.latitude - a.latitude) * rad
  const dLng = (b.longitude - a.longitude) * rad
  const lat1 = a.latitude * rad
  const lat2 = b.latitude * rad
  const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return Math.round(EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)))
}

function formatDistance(meters) {
  if (meters == null || isNaN(meters)) return ''
  if (meters < 1000) return '约 ' + meters + ' 米'
  return '约 ' + (meters / 1000).toFixed(1) + ' 公里'
}

// 下一处未完成站点；全部完成返回 null。
function nextSite(snapshot) {
  const stations = (snapshot && snapshot.stations) || {}
  for (const site of SITES) {
    if (!stations[site.station]) return site
  }
  return null
}

// 拉起导航。native provider 直接用微信内置地图；
// 未来接入腾讯地图插件时在此分支，调用方与页面不变。
function openNavigation(site) {
  return new Promise(function (resolve, reject) {
    if (registry.mapProvider() === 'tencent-plugin') {
      reject(new Error('tencent-plugin provider 尚未接入'))
      return
    }
    wx.openLocation({
      latitude: site.latitude,
      longitude: site.longitude,
      name: site.name,
      address: '圆明园西洋楼景区',
      scale: 17,
      success: resolve,
      fail: reject
    })
  })
}

module.exports = {
  SITES,
  distanceMeters,
  formatDistance,
  nextSite,
  openNavigation
}
