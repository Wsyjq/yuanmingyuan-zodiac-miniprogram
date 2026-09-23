const assert = require('node:assert/strict')
const test = require('node:test')

const { SITE_IDS } = require('../plate21/module/flow/contract')
const nav = require('../plate21/module/capabilities/map/nav-model')

function byId(sites) {
  const index = Object.create(null)
  for (let i = 0; i < sites.length; i++) index[sites[i].id] = sites[i]
  return index
}

test('eight mainline sites match contract.SITE_IDS', () => {
  const sites = nav.listSites()
  assert.deepEqual(sites.map(function (site) { return site.id }), SITE_IDS)
  assert.equal(sites.length, 8)
  const ids = sites.map(function (site) { return site.id })
  assert.equal(ids.indexOf('yuanyingguan'), -1)
  assert.equal(ids.indexOf('guanshuifa'), -1)
  assert.equal(ids.indexOf('wuzhuting'), -1)
})

test('xushuilou is north of haiyantang, not the old merged pin', () => {
  const sites = byId(nav.listSites())
  assert.ok(sites.xushuilou.latitude > sites.haiyantang.latitude)
  assert.notDeepEqual(
    [sites.haiyantang.latitude, sites.haiyantang.longitude],
    [sites.dashuifa.latitude, sites.dashuifa.longitude]
  )
  assert.notDeepEqual(
    [sites.xushuilou.latitude, sites.xushuilou.longitude],
    [40.00628, 116.31235]
  )
  const fromXieqiqu = Math.abs(sites.xushuilou.longitude - sites.xieqiqu.longitude)
  const fromHaiyantang = Math.abs(sites.xushuilou.longitude - sites.haiyantang.longitude)
  assert.ok(fromHaiyantang < fromXieqiqu)
})

test('xieqiqu is west of the gate-maze midpoint; fangwaiguan is between maze and haiyantang', () => {
  const sites = byId(nav.listSites())
  assert.ok(sites.xieqiqu.longitude > sites.gate.longitude)
  assert.ok(sites.xieqiqu.longitude < sites.maze.longitude)
  const mid = (sites.gate.longitude + sites.maze.longitude) / 2
  assert.ok(sites.xieqiqu.longitude < mid)

  const west = Math.min(sites.maze.longitude, sites.haiyantang.longitude)
  const east = Math.max(sites.maze.longitude, sites.haiyantang.longitude)
  assert.ok(sites.fangwaiguan.longitude > west)
  assert.ok(sites.fangwaiguan.longitude < east)
})

test('leg distance is positive along the mainline', () => {
  const sites = nav.listSites()
  for (let i = 0; i < sites.length - 1; i++) {
    const step = nav.leg(sites[i].id, sites[i + 1].id)
    assert.equal(step.from.id, sites[i].id)
    assert.equal(step.to.id, sites[i + 1].id)
    assert.equal(typeof step.distanceMeters, 'number')
    assert.ok(step.distanceMeters > 0)
    assert.equal(step.title, sites[i].name + ' → ' + sites[i + 1].name)
  }
})

test('side button is hidden when siteId is empty', () => {
  assert.deepEqual(nav.sideButton(''), { visible: false, siteId: '' })
  assert.deepEqual(nav.sideButton(null), { visible: false, siteId: null })
  assert.deepEqual(nav.sideButton(undefined), { visible: false, siteId: undefined })
  assert.deepEqual(nav.sideButton('gate'), { visible: true, siteId: 'gate' })
})
