'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const Jimp = require('jimp')

const ROOT = path.resolve(__dirname, '..')
const IMAGE_DIR = path.join(ROOT, 'plate21', 'module', 'assets', 'img')
const RAW_DIR = path.join(__dirname, 'gen-raw')
const GENERATION_LOG = path.join(__dirname, 'gen-all.log')
const PROJECT_CONFIG = path.join(ROOT, 'project.config.json')
const HISTORIC_SCAN_IDS = new Set(['IMG-F06', 'IMG-S2A', 'IMG-S3C', 'IMG-S4A', 'img-c01'])

function normalize(filePath) {
  return filePath.split(path.sep).join('/')
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function inspectSupportingFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null
  const buffer = fs.readFileSync(filePath)
  return {
    path: normalize(path.relative(ROOT, filePath)),
    bytes: buffer.length,
    sha256: sha256(buffer)
  }
}

function findRawPath(fileName) {
  const stem = path.basename(fileName, path.extname(fileName))
  const direct = path.join(RAW_DIR, `${stem}.png`)
  if (fs.existsSync(direct)) return direct
  return null
}

function classifyEvidence(filePath, loggedIds) {
  const fileName = path.basename(filePath)
  const stem = path.basename(fileName, path.extname(fileName))
  const rawPath = findRawPath(fileName)

  if (HISTORIC_SCAN_IDS.has(stem)) {
    const supersededPath = stem === 'img-c01'
      ? path.join(__dirname, 'gen-img-c01.png')
      : rawPath
    return {
      sourceCategory: 'historic-scan',
      sourceEvidence: null,
      supersededAiEvidence: inspectSupportingFile(supersededPath)
    }
  }

  if (rawPath) {
    return {
      sourceCategory: loggedIds.has(stem) ? 'ai-generation-log-and-raw' : 'ai-raw-only',
      sourceEvidence: inspectSupportingFile(rawPath),
      supersededAiEvidence: null
    }
  }

  return {
    sourceCategory: 'ai-source-file-only',
    sourceEvidence: inspectSupportingFile(path.join(IMAGE_DIR, `${stem}.png`)),
    supersededAiEvidence: null
  }
}

async function inspect(filePath, ignoredFiles, loggedIds) {
  const buffer = fs.readFileSync(filePath)
  const image = await Jimp.read(buffer)
  const relativePath = normalize(path.relative(ROOT, filePath))
  return {
    path: relativePath,
    bytes: buffer.length,
    dimensions: `${image.bitmap.width}x${image.bitmap.height}`,
    sha256: sha256(buffer),
    packageStatus: ignoredFiles.has(relativePath) ? 'ignored' : 'bundled',
    ...classifyEvidence(filePath, loggedIds)
  }
}

async function main() {
  const config = JSON.parse(fs.readFileSync(PROJECT_CONFIG, 'utf8'))
  const ignoredFiles = new Set((config.packOptions && config.packOptions.ignore || [])
    .filter((entry) => entry.type === 'file')
    .map((entry) => normalize(entry.value)))
  const generationLog = fs.existsSync(GENERATION_LOG) ? fs.readFileSync(GENERATION_LOG, 'utf8') : ''
  const loggedIds = new Set(generationLog.match(/IMG-[A-Z0-9-]+/g) || [])

  const controlledName = (name) => /^IMG-.*\.jpe?g$/i.test(name) || /^img-c01\.jpe?g$/i.test(name)
  const files = fs.readdirSync(IMAGE_DIR)
    .filter(controlledName)
    .map((name) => path.join(IMAGE_DIR, name))

  const hostDir = path.join(ROOT, 'assets', 'host')
  if (fs.existsSync(hostDir)) {
    files.push(...fs.readdirSync(hostDir)
      .filter(controlledName)
      .map((name) => path.join(hostDir, name)))
  }

  const rows = []
  for (const filePath of files.sort()) rows.push(await inspect(filePath, ignoredFiles, loggedIds))

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    generationLog: inspectSupportingFile(GENERATION_LOG),
    files: rows
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
