'use strict'

function dateKeyFromTimestamp(timestamp) {
  const date = new Date(Number(timestamp))
  return String(date.getFullYear()) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0')
}

function isValidDateKey(value) {
  const key = String(value || '')
  if (!/^\d{8}$/.test(key)) return false
  const year = Number(key.slice(0, 4))
  const month = Number(key.slice(4, 6))
  const day = Number(key.slice(6, 8))
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function parts(value) {
  if (!isValidDateKey(value)) return null
  const key = String(value)
  return {
    year: Number(key.slice(0, 4)),
    month: Number(key.slice(4, 6)),
    day: Number(key.slice(6, 8))
  }
}

function formatDateKey(value) {
  const date = parts(value)
  return date ? date.year + ' 年 ' + date.month + ' 月 ' + date.day + ' 日' : ''
}

function formatShortDate(value) {
  const date = parts(value)
  return date ? date.month + '月' + date.day + '日' : ''
}

function formatArchiveDate(value) {
  const date = parts(value)
  return date
    ? String(date.year) + '.' + String(date.month).padStart(2, '0') + '.' + String(date.day).padStart(2, '0')
    : ''
}

module.exports = {
  dateKeyFromTimestamp,
  isValidDateKey,
  formatDateKey,
  formatShortDate,
  formatArchiveDate
}
