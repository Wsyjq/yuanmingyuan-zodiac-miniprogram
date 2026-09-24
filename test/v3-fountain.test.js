'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const model = require('../plate21/module/play/fountain-placement')
test('fountain drop uses scene coordinates at different widths and scroll positions', () => {
  for (const width of [280, 390, 760]) {
    const rect = { left: 24, top: -80, width, height: width * .5628 }
    let placed = {}
    for (const id of ['dogs', 'deer']) {
      const t = model.TARGETS[id]
      const result = model.drop(placed, id, { clientX: rect.left + t.x * rect.width, clientY: rect.top + t.y * rect.height }, rect)
      assert.equal(result.accepted, true); placed = result.placed
    }
    assert.equal(model.complete(placed), true)
    assert.equal(model.drop({}, 'deer', { clientX: 30, clientY: -75 }, rect).accepted, false)
  }
  assert.equal(model.hit('deer', {}, null), false)
})
function harness(placed, readOnly) {
  let definition
  global.Component = value => { definition = value }
  const file = require.resolve('../plate21/module/components/fountain-puzzle/fountain-puzzle')
  delete require.cache[file]; require(file)
  const events = []
  const c = Object.assign({}, definition.methods, {
    properties: { placed, active: true, readOnly: !!readOnly },
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(value) { Object.assign(this.data, value) },
    triggerEvent(name, value) { events.push({ name, value }) },
    createSelectorQuery() { return { select() { return this }, boundingClientRect(fn) { fn({ left: 0, top: 0, width: 300, height: 170 }); return this }, exec() {} } }
  })
  definition.lifetimes.attached.call(c)
  return { c, definition, events }
}
const event = id => ({ currentTarget: { dataset: { id } } })
test('fountain only starts after both placements; restored draft and background stay consistent', () => {
  const { c, definition, events } = harness({ deer: 'center' })
  assert.equal(c.data.flowing, false)
  c.onSelect(event('dogs')); c.onTarget(event('deer'))
  assert.equal(events.length, 0)
  c.onTarget(event('dogs')); assert.equal(c.data.flowing, true)
  assert.equal(events.length, 1)
  definition.pageLifetimes.hide.call(c); assert.equal(c.data.flowing, false)
  definition.pageLifetimes.show.call(c); assert.equal(c.data.flowing, true)
  const restored = harness(events[0].value.placed, true)
  assert.equal(restored.c.data.complete, true)
  restored.c.onSelect(event('deer')); restored.c.onTarget(event('deer'))
  assert.equal(restored.events.length, 0)
})
test('drag places correct piece, misses preserve draft, cancelled drag never places', () => {
  const { c, definition, events } = harness({})
  const start = () => c.onStart(Object.assign(event('deer'), { touches: [{ clientX: 50, clientY: 240 }] }))
  start(); c.onMove({ touches: [{ clientX: 1, clientY: 1 }] }); c.onEnd({ changedTouches: [{ clientX: 1, clientY: 1 }] })
  assert.equal(events.length, 0)
  start(); c.onMove({ touches: [{ clientX: 153, clientY: 109 }] }); definition.pageLifetimes.hide.call(c); c.onEnd({})
  assert.equal(events.length, 0)
  definition.pageLifetimes.show.call(c)
  start(); c.onMove({ touches: [{ clientX: 153, clientY: 109 }] }); c.onEnd({ changedTouches: [{ clientX: 153, clientY: 109 }] })
  assert.equal(events[0].value.placed.deer, 'center'); assert.equal(c.data.complete, false)
})
