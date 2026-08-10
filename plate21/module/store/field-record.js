'use strict'

const FIELD_POINTS = [
  { key: 'dome', no: '01', title: '穹顶与飞檐' },
  { key: 'beast', no: '02', title: '檐角立兽' },
  { key: 'lotus', no: '03', title: '莲座宝瓶' },
  { key: 'swan', no: '04', title: '双天鹅蝙蝠纹' }
]

function photosFromSnapshot(snapshot) {
  const record = snapshot && snapshot.flags && snapshot.flags.s2PhotoRecord
  const photos = record && record.photos || {}
  return FIELD_POINTS.map(function (point) {
    return Object.assign({}, point, { photoPath: photos[point.key] || '' })
  })
}

module.exports = {
  FIELD_POINTS: FIELD_POINTS,
  photosFromSnapshot: photosFromSnapshot
}
