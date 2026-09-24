/**
 * 主线 8 个点（gcj02）。
 * 由西向东：入口、谐奇趣、黄花阵（谐奇趣北）、方外观、海晏堂、
 * 蓄水楼（海晏堂北）、大水法、雨果雕像（大水法南）。
 * 远瀛观、观水法、五竹亭不单开。
 * 坐标：公开 WGS84（黄花阵 40.01235,116.30225，西洋楼中部 40.01230,116.30660）
 * 按西向东路线排开后换成 GCJ-02。到现场仍以这一处为准再改。
 */
'use strict'

const { SITE_IDS } = require('../../flow/contract')
const progressFlow = require('../../store/progress-flow')

const BY_ID = {
  gate: {
    name: '西洋楼入口',
    latitude: 40.012816,
    longitude: 116.306888,
    page: '/plate21/module/pages/s1-decode/s1-decode'
  },
  xieqiqu: {
    name: '谐奇趣',
    latitude: 40.012818,
    longitude: 116.308391,
    page: '/plate21/module/pages/waypoint/waypoint?site=xieqiqu'
  },
  maze: {
    name: '黄花阵',
    latitude: 40.013618,
    longitude: 116.308341,
    page: '/plate21/module/pages/s2-quiz/s2-quiz'
  },
  fangwaiguan: {
    name: '方外观',
    latitude: 40.013173,
    longitude: 116.310896,
    page: '/plate21/module/pages/waypoint/waypoint?site=fangwaiguan'
  },
  haiyantang: {
    name: '海晏堂',
    latitude: 40.013126,
    longitude: 116.3129,
    page: '/plate21/module/pages/s3-comic/s3-comic'
  },
  xushuilou: {
    name: '蓄水楼',
    latitude: 40.013826,
    longitude: 116.313001,
    page: '/plate21/module/pages/waypoint/waypoint?site=xushuilou'
  },
  dashuifa: {
    name: '大水法',
    latitude: 40.01298,
    longitude: 116.314904,
    page: '/plate21/module/pages/dashuifa/dashuifa'
  },
  hugo: {
    name: '雨果雕像',
    latitude: 40.01248,
    longitude: 116.315004,
    page: '/plate21/module/pages/s4-timeline/s4-timeline'
  }
}

const CHECKPOINT_SITE = {
  prologue: -1,
  's1-decode': 0,
  'xq-sound': 1,
  's2-purpose': 2,
  's2-name': 2,
  's2-blend': 2,
  's2-pattern': 2,
  'fw-three': 3,
  's3-hour': 4,
  's3-zodiac': 4,
  's3-water': 4,
  'xs-height': 5,
  'ds-hunt': 6,
  's4-timeline': 7,
  's4-password': 7,
  finale: 7,
  report: 7
}

const SITES = SITE_IDS.map(function (id) {
  const row = BY_ID[id]
  if (!row) throw new Error('mainline site missing: ' + id)
  return {
    id: id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    page: row.page
  }
})

function reachedIndex(snapshot) {
  const checkpoint = progressFlow.deriveCheckpoint(snapshot)
  const index = CHECKPOINT_SITE[checkpoint]
  return typeof index === 'number' ? index : -1
}

function visitState(snapshot) {
  const at = reachedIndex(snapshot)
  return SITES.map(function (site, index) {
    return Object.assign({}, site, {
      opened: index <= at,
      current: index === at,
      isNext: index === at + 1
    })
  })
}

function nextSite(snapshot) {
  const rows = visitState(snapshot)
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].isNext) return rows[i]
  }
  return null
}

module.exports = {
  SITES,
  reachedIndex,
  visitState,
  nextSite
}
