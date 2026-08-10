'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.config.json'), 'utf8'))
const ignores = ((config.packOptions && config.packOptions.ignore) || []).map((rule) => ({
  type: rule.type,
  value: rule.value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '')
}))

function ignored(rel) {
  const normalized = rel.replace(/\\/g, '/')
  return ignores.some((rule) => {
    if (rule.type === 'folder') return normalized === rule.value || normalized.startsWith(rule.value + '/')
    if (rule.type === 'file') return normalized === rule.value
    return false
  })
}

function walk(dir, rows) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    const rel = path.relative(ROOT, file).replace(/\\/g, '/')
    if (ignored(rel)) continue
    if (entry.isDirectory()) walk(file, rows)
    else rows.push({ rel, bytes: fs.statSync(file).size })
  }
}

const rows = []
walk(ROOT, rows)
const subRoot = 'plate21/module/'
const subpackage = rows.filter((row) => row.rel.startsWith(subRoot))
const main = rows.filter((row) => !row.rel.startsWith(subRoot))

function sum(items) {
  return items.reduce((total, item) => total + item.bytes, 0)
}

function mib(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MiB'
}

console.log('main       ' + mib(sum(main)) + ' (' + main.length + ' files)')
console.log('subpackage ' + mib(sum(subpackage)) + ' (' + subpackage.length + ' files)')
console.log('total      ' + mib(sum(rows)) + ' (' + rows.length + ' files)')
console.log('largest subpackage files:')
subpackage.sort((a, b) => b.bytes - a.bytes).slice(0, 10).forEach((row) => {
  console.log(String(row.bytes).padStart(8) + '  ' + row.rel)
})

if (sum(subpackage) > 2 * 1024 * 1024) {
  console.error('FAIL subpackage exceeds the 2 MiB internal gate')
  process.exitCode = 1
}
