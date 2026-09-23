/**
 * 主线 8 个点（gcj02）。公开地图近似值，待现场校准。
 * 入口、黄花阵、雨果沿用旧四站坐标。谐奇趣在入口与黄花阵之间偏西，
 * 方外观在黄花阵与海晏堂之间。海晏堂与大水法从旧合并点
 * 「海晏堂·大水法」(40.00628, 116.31235) 拆开，该点不再当成任何一站。
 * 蓄水楼在海晏堂北侧，不是谐奇趣西北那座。
 * 远瀛观、观水法不单开，五竹亭不单开。
 */
'use strict'

const { SITE_IDS } = require('../../flow/contract')

const BY_ID = {
  gate: { name: '西洋楼入口', latitude: 40.00702, longitude: 116.30653 },
  xieqiqu: { name: '谐奇趣', latitude: 40.00708, longitude: 116.30728 },
  maze: { name: '黄花阵', latitude: 40.0072, longitude: 116.30892 },
  fangwaiguan: { name: '方外观', latitude: 40.00674, longitude: 116.31020 },
  haiyantang: { name: '海晏堂', latitude: 40.00628, longitude: 116.31170 },
  xushuilou: { name: '蓄水楼', latitude: 40.00678, longitude: 116.31174 },
  dashuifa: { name: '大水法', latitude: 40.00612, longitude: 116.31272 },
  hugo: { name: '雨果雕像', latitude: 40.0059, longitude: 116.31218 }
}

const SITES = SITE_IDS.map(function (id) {
  const row = BY_ID[id]
  if (!row) throw new Error('mainline site missing: ' + id)
  return {
    id: id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude
  }
})

module.exports = {
  SITES
}
