'use strict'

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const THIRD_PARTY_LOCK = path.join(ROOT, 'plate21', 'module', 'assets', 'third-party-lock.json')
const REQUIRED_PACKAGE_IGNORES = [
  'project.private.config.json',
  'plate21/module/assets/third-party-lock.json'
]
const EXCLUDED = new Set([
  path.join(ROOT, '.zcode'),
  path.join(ROOT, '.playwright-cli'),
  path.join(ROOT, 'test', 'node_modules'),
  path.join(ROOT, 'plate21', 'module', 'vendor')
])

function isExcluded(file) {
  for (const dir of EXCLUDED) {
    if (file === dir || file.startsWith(dir + path.sep)) return true
  }
  return false
}

function walk(dir, out) {
  if (isExcluded(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (isExcluded(file)) continue
    if (entry.isDirectory()) walk(file, out)
    else out.push(file)
  }
}

function relative(file) {
  return path.relative(ROOT, file).split(path.sep).join('/')
}

function fail(message) {
  console.error('FAIL ' + message)
  process.exitCode = 1
}

const files = []
walk(ROOT, files)

let jsCount = 0
for (const file of files.filter((item) => item.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (result.status !== 0) fail(relative(file) + ': ' + (result.stderr || result.stdout).trim())
  jsCount++
}

let jsonCount = 0
for (const file of files.filter((item) => item.endsWith('.json'))) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'))
    jsonCount++
  } catch (err) {
    fail(relative(file) + ': JSON 解析失败: ' + err.message)
  }
}

const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'))
const projectConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.config.json'), 'utf8'))
const ignoredPackageFiles = new Set(((projectConfig.packOptions && projectConfig.packOptions.ignore) || [])
  .filter((rule) => rule.type === 'file')
  .map((rule) => String(rule.value || '').replace(/\\/g, '/').replace(/^\.\//, '')))
for (const file of REQUIRED_PACKAGE_IGNORES) {
  if (!ignoredPackageFiles.has(file)) fail(file + ': 仅开发/审计使用，必须从生产包排除')
}

const modulePkg = (app.subpackages || []).find((pkg) => pkg.root === 'plate21/module')
if (!modulePkg) {
  fail('app.json: 缺少 plate21/module 分包')
} else if ((modulePkg.pages || [])[0] !== 'pages/gate/gate') {
  fail('app.json: 模块正门必须是 pages/gate/gate，当前=' + ((modulePkg.pages || [])[0] || '(empty)'))
}
const privateInfos = app.requiredPrivateInfos || []
if (!privateInfos.includes('getLocation')) {
  fail('app.json: requiredPrivateInfos 必须包含 getLocation（真机定位/提审硬门槛）')
}
const permKeys = Object.keys(app.permission || {})
const illegalPerm = permKeys.filter((key) => key !== 'scope.userLocation')
if (illegalPerm.length) {
  fail('app.json permission 仅支持 scope.userLocation，非法键: ' + illegalPerm.join(','))
}
if (!permKeys.includes('scope.userLocation')) {
  fail('app.json: 缺少 permission.scope.userLocation')
}

const routes = (app.pages || []).slice()
for (const subpackage of app.subpackages || []) {
  for (const page of subpackage.pages || []) routes.push(subpackage.root + '/' + page)
}
for (const route of routes) {
  for (const ext of ['.js', '.json', '.wxml', '.wxss']) {
    const file = path.join(ROOT, route + ext)
    if (!fs.existsSync(file)) fail(route + ext + ': app.json 已注册但文件不存在')
  }
}

const sourceFiles = files.filter((file) => {
  // Compliance metadata contains repository-relative paths, not Mini Program
  // runtime asset URLs, so it must not enter the runtime reference scan.
  if (file === THIRD_PARTY_LOCK) return false
  if (!/\.(js|wxml|wxss|json)$/.test(file)) return false
  return file.startsWith(path.join(ROOT, 'pages') + path.sep) ||
    file.startsWith(path.join(ROOT, 'plate21', 'module') + path.sep) ||
    file === path.join(ROOT, 'app.js') || file === path.join(ROOT, 'app.json')
})
const assetPattern = /\/(?:plate21\/module\/)?assets\/[A-Za-z0-9_./-]+/g
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8')
  for (const ref of source.match(assetPattern) || []) {
    const target = path.join(ROOT, ref.slice(1).split('/').join(path.sep))
    if (!fs.existsSync(target)) fail(relative(file) + ': 素材不存在 ' + ref)
  }
}

if (!process.exitCode) {
  console.log('OK syntax=' + jsCount + ' json=' + jsonCount + ' routes=' + routes.length)
}
