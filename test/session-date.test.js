const assert = require('node:assert/strict')
const test = require('node:test')

const sessionDate = require('../plate21/module/utils/session-date')

test('session date validates real calendar dates', () => {
  assert.equal(sessionDate.isValidDateKey('20260811'), true)
  assert.equal(sessionDate.isValidDateKey('20260229'), false)
  assert.equal(sessionDate.isValidDateKey('20240229'), true)
  assert.equal(sessionDate.isValidDateKey('20261301'), false)
  assert.equal(sessionDate.isValidDateKey('not-a-date'), false)
})

test('session date formats one locked key consistently', () => {
  assert.equal(sessionDate.formatDateKey('20260811'), '2026 年 8 月 11 日')
  assert.equal(sessionDate.formatShortDate('20260811'), '8月11日')
  assert.equal(sessionDate.formatArchiveDate('20260811'), '2026.08.11')
})

test('date key uses local calendar fields from the supplied timestamp', () => {
  const timestamp = new Date(2026, 7, 11, 23, 59, 30).getTime()
  assert.equal(sessionDate.dateKeyFromTimestamp(timestamp), '20260811')
})
