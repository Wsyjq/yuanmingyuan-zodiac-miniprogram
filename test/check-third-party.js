'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.resolve(__dirname, '..')
const LOCK_FILE = path.join(ROOT, 'plate21', 'module', 'assets', 'third-party-lock.json')
const PROJECT_CONFIG_FILE = path.join(ROOT, 'project.config.json')
const IMAGE_DIR = path.join(ROOT, 'plate21', 'module', 'assets', 'img')
const IMAGE_RESOURCE_IDS = new Set(['IMG-HOLD-AI', 'IMG-HOLD-SHUGE'])
const HISTORIC_SCAN_FILES = new Set([
  'assets/host/IMG-F06.jpg',
  'plate21/module/assets/img/IMG-F06.jpg',
  'plate21/module/assets/img/IMG-S2A.jpg',
  'plate21/module/assets/img/IMG-S3C.jpg',
  'plate21/module/assets/img/IMG-S4A.jpg',
  'plate21/module/assets/img/img-c01.jpg'
])
const GENERATION_LOG = 'test/gen-all.log'
const strictCommercial = process.argv.includes('--commercial')

function normalize(relativePath) {
  return relativePath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '')
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

function fail(errors, message) {
  errors.push(message)
}

function sha256(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, relativePath))).digest('hex')
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function sameMembers(left, right) {
  if (left.size !== right.size) return false
  for (const value of left) {
    if (!right.has(value)) return false
  }
  return true
}

const errors = []
const warnings = []
let lock
let projectConfig

try {
  lock = readJson(LOCK_FILE)
  projectConfig = readJson(PROJECT_CONFIG_FILE)
} catch (error) {
  console.error('FAIL compliance metadata:', error.message)
  process.exit(1)
}

const ignoreRules = ((projectConfig.packOptions && projectConfig.packOptions.ignore) || []).map((rule) => ({
  type: rule.type,
  value: normalize(rule.value)
}))

function ignoredFromPackage(relativePath) {
  const normalized = normalize(relativePath)
  return ignoreRules.some((rule) => {
    if (rule.type === 'folder') return normalized === rule.value || normalized.startsWith(rule.value + '/')
    if (rule.type === 'file') return normalized === rule.value
    return false
  })
}

function currentImageFiles() {
  const controlledName = (name) => /^IMG-.*\.jpe?g$/i.test(name) || /^img-c01\.jpe?g$/i.test(name)
  const files = fs.readdirSync(IMAGE_DIR)
    .filter(controlledName)
    .map((name) => `plate21/module/assets/img/${name}`)
  const hostDir = path.join(ROOT, 'assets', 'host')
  if (fs.existsSync(hostDir)) {
    files.push(...fs.readdirSync(hostDir)
      .filter(controlledName)
      .map((name) => `assets/host/${name}`))
  }
  return files.sort()
}

if (lock.schemaVersion !== 1) fail(errors, 'unsupported schemaVersion')
if (!Array.isArray(lock.resources) || !lock.resources.length) fail(errors, 'resources must be a non-empty array')
if (!lock.policy || !exists(lock.policy)) fail(errors, `missing policy file ${lock.policy || '(unset)'}`)

const ids = new Set()
const fileOwners = new Map()
for (const resource of lock.resources || []) {
  if (!resource.id) {
    fail(errors, 'resource without id')
    continue
  }
  if (ids.has(resource.id)) fail(errors, `duplicate id: ${resource.id}`)
  ids.add(resource.id)

  if (!['approved', 'hold', 'rejected'].includes(resource.status)) {
    fail(errors, `${resource.id}: invalid status ${resource.status}`)
  }
  if (resource.status === 'approved') {
    if (!resource.license) fail(errors, `${resource.id}: missing license`)
    if (!resource.licenseFile || !exists(resource.licenseFile)) {
      fail(errors, `${resource.id}: missing license file ${resource.licenseFile || '(unset)'}`)
    }
  }
  const resourceFiles = new Set()
  for (const rawFile of resource.files || []) {
    const file = normalize(rawFile)
    if (file !== rawFile) fail(errors, `${resource.id}: file path must be normalized ${rawFile}`)
    if (resourceFiles.has(file)) fail(errors, `${resource.id}: duplicate tracked file ${file}`)
    resourceFiles.add(file)
    if (fileOwners.has(file)) fail(errors, `${file}: tracked by both ${fileOwners.get(file)} and ${resource.id}`)
    else fileOwners.set(file, resource.id)
    if (!exists(file)) fail(errors, `${resource.id}: missing tracked file ${file}`)
  }
  for (const rawFile of resource.evidenceFiles || []) {
    const file = normalize(rawFile)
    if (file !== rawFile) fail(errors, `${resource.id}: evidence path must be normalized ${rawFile}`)
    if (!exists(file)) fail(errors, `${resource.id}: missing evidence file ${file}`)
  }
  for (const [rawFile, expected] of Object.entries(resource.hashes || {})) {
    const file = normalize(rawFile)
    if (file !== rawFile) fail(errors, `${resource.id}: hash path must be normalized ${rawFile}`)
    if (!resourceFiles.has(file)) fail(errors, `${resource.id}: hash recorded for untracked file ${file}`)
    if (!/^[a-f0-9]{64}$/.test(String(expected))) fail(errors, `${resource.id}: invalid SHA-256 ${file}`)
    if (!exists(file)) continue
    const actual = sha256(file)
    if (actual !== String(expected)) {
      fail(errors, `${resource.id}: SHA-256 mismatch ${file}`)
    }
  }
  const bundledFiles = Array.isArray(resource.bundledFiles) ? resource.bundledFiles : []
  const bundledFileSet = new Set()
  for (const rawFile of bundledFiles) {
    const file = normalize(rawFile)
    if (file !== rawFile) fail(errors, `${resource.id}: bundled path must be normalized ${rawFile}`)
    if (bundledFileSet.has(file)) fail(errors, `${resource.id}: duplicate bundled file ${file}`)
    bundledFileSet.add(file)
    if (!resourceFiles.has(file)) fail(errors, `${resource.id}: bundled file is not tracked ${file}`)
  }
  const hasBundledFiles = Array.isArray(resource.bundledFiles) ? bundledFiles.length > 0 : Boolean(resource.bundled)
  if (resource.status === 'hold' && hasBundledFiles) {
    warnings.push(`${resource.id}: bundled resource remains on hold`)
  }
  if (resource.status === 'rejected' && hasBundledFiles) {
    warnings.push(`${resource.id}: bundled resource is rejected`)
  }
}

const imageFiles = currentImageFiles()
const imageFileSet = new Set(imageFiles)
for (const id of IMAGE_RESOURCE_IDS) {
  const resource = (lock.resources || []).find((item) => item.id === id)
  if (!resource) {
    fail(errors, `missing image resource ${id}`)
    continue
  }
  if (resource.filePatterns) fail(errors, `${id}: filePatterns are not allowed for controlled images`)
  if (!Array.isArray(resource.files) || !resource.files.length) fail(errors, `${id}: files must be explicit`)
  if (!Array.isArray(resource.evidenceFiles) || !resource.evidenceFiles.length) {
    fail(errors, `${id}: evidenceFiles must be a non-empty array`)
  }
  if (!Array.isArray(resource.evidenceUrls) || !resource.evidenceUrls.length) {
    fail(errors, `${id}: evidenceUrls must be a non-empty array`)
  }

  const tracked = new Set((resource.files || []).map(normalize))
  for (const file of tracked) {
    if (!imageFileSet.has(file)) fail(errors, `${id}: stale or unsupported image path ${file}`)
    if (!resource.hashes || !resource.hashes[file]) fail(errors, `${id}: missing SHA-256 ${file}`)
  }

  const actualBundled = new Set([...tracked].filter((file) => !ignoredFromPackage(file)))
  const recordedBundled = new Set((resource.bundledFiles || []).map(normalize))
  if (!sameMembers(actualBundled, recordedBundled)) {
    fail(errors, `${id}: bundledFiles do not match project.config.json`)
  }
  if (Boolean(resource.bundled) !== (actualBundled.size > 0)) {
    fail(errors, `${id}: bundled flag does not match bundledFiles`)
  }

  if (id === 'IMG-HOLD-AI') {
    if (!/^[a-f0-9]{64}$/.test(String(resource.generationLogSha256))) {
      fail(errors, `${id}: invalid generationLogSha256`)
    } else if (!exists(GENERATION_LOG) || sha256(GENERATION_LOG) !== resource.generationLogSha256) {
      fail(errors, `${id}: generation log SHA-256 mismatch`)
    }
  }
}

for (const file of imageFiles) {
  const owner = fileOwners.get(file)
  const expectedOwner = HISTORIC_SCAN_FILES.has(file) ? 'IMG-HOLD-SHUGE' : 'IMG-HOLD-AI'
  if (!owner) fail(errors, `untracked controlled image: ${file}`)
  else if (owner !== expectedOwner) fail(errors, `${file}: expected ${expectedOwner}, found ${owner}`)
}

const vendorDir = path.join(ROOT, 'plate21', 'module', 'vendor')
for (const name of fs.readdirSync(vendorDir)) {
  const relative = `plate21/module/vendor/${name}`
  const covered = (lock.resources || []).some((resource) => (resource.files || []).includes(relative))
  if (!covered) fail(errors, `untracked vendor file: ${relative}`)
}

if (strictCommercial && warnings.length) {
  warnings.forEach((message) => fail(errors, message))
}

for (const warning of warnings) console.warn('HOLD', warning)
if (errors.length) {
  errors.forEach((message) => console.error('FAIL', message))
  process.exit(1)
}

console.log(`OK third-party resources=${lock.resources.length} images=${imageFiles.length} holds=${warnings.length} mode=${strictCommercial ? 'commercial' : 'structural'}`)
