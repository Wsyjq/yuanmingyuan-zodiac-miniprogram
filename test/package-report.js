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
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'))
const subpackageRoots = (app.subpackages || []).map((subpackage) => {
  return subpackage.root.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '') + '/'
}).sort((a, b) => b.length - a.length)
const packages = new Map(subpackageRoots.map((root) => [root, []]))
const main = []

for (const row of rows) {
  const root = subpackageRoots.find((candidate) => row.rel.startsWith(candidate))
  if (root) packages.get(root).push(row)
  else main.push(row)
}

function sum(items) {
  return items.reduce((total, item) => total + item.bytes, 0)
}

function mib(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MiB'
}

console.log('main       ' + mib(sum(main)) + ' (' + main.length + ' files)')
for (const [root, items] of packages) {
  console.log(('subpackage ' + root).padEnd(28) + mib(sum(items)) + ' (' + items.length + ' files)')
}
console.log('total      ' + mib(sum(rows)) + ' (' + rows.length + ' files)')
if (process.argv.includes('--verbose')) console.log('largest main files:')
if (process.argv.includes('--verbose')) main.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 10).forEach((row) => {
  console.log(String(row.bytes).padStart(8) + '  ' + row.rel)
})

for (const [root, items] of packages) {
  if (!process.argv.includes('--verbose')) continue
  console.log('largest files in ' + root + ':')
  items.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 10).forEach((row) => {
    console.log(String(row.bytes).padStart(8) + '  ' + row.rel)
  })
}

const MIB = 1024 * 1024
if (sum(main) > 2 * MIB) {
  console.error('FAIL main package exceeds the 2 MiB gate')
  process.exitCode = 1
}
for (const [root, items] of packages) {
  if (sum(items) <= 2 * MIB) continue
  console.error('FAIL subpackage ' + root + ' exceeds the 2 MiB gate')
  process.exitCode = 1
}
if (sum(rows) > 20 * MIB) {
  console.error('FAIL total package exceeds the 20 MiB project budget')
  process.exitCode = 1
}
