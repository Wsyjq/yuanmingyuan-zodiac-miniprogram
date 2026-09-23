/**
 * 站间整页导航的只读数据，以及站内侧边按钮是否出现。
 * 不画路线，不写剧情句，不调用 wx。距离复用 site-geo 的球面算法。
 */
'use strict'

const siteGeo = require('./site-geo')
const { SITES } = require('./sites-mainline')

function copySite(site) {
  return {
    id: site.id,
    name: site.name,
    latitude: site.latitude,
    longitude: site.longitude
  }
}

function findSite(id) {
  for (let i = 0; i < SITES.length; i++) {
    if (SITES[i].id === id) return SITES[i]
  }
  return null
}

function listSites() {
  return SITES.map(copySite)
}

function leg(fromId, toId) {
  const from = findSite(fromId)
  const to = findSite(toId)
  if (!from || !to) {
    throw new Error('unknown site: ' + (!from ? fromId : toId))
  }
  return {
    from: copySite(from),
    to: copySite(to),
    distanceMeters: siteGeo.distanceMeters(from, to),
    title: from.name + ' → ' + to.name
  }
}

function sideButton(siteId) {
  const visible = typeof siteId === 'string' && siteId !== ''
  return { visible: visible, siteId: siteId }
}

module.exports = {
  listSites,
  leg,
  sideButton
}
