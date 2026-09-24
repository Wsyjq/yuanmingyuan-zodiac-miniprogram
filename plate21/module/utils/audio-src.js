'use strict'

// Unknown or retired narration is silent. No development-server fallback on phones.
const bundled = require('./voice-pkg-map')
const manifest = require('../audio/v3-manifest')
const resources = require('../host/resources')
const pathPackages = {}
Object.keys(bundled).forEach(function (id) {
  const src = bundled[id]
  const match = src.match(/^\/(voice-[a-z]+)\//)
  if (match) pathPackages[src] = match[1]
})

function bundledClips(id) {
  if (!id || typeof id !== 'string') return []
  const entry = Object.prototype.hasOwnProperty.call(manifest.entries, id) ? manifest.entries[id] : null
  if (entry) return entry.enabled ? entry.files.slice() : []
  // Preserve optional history/dialogue audio. Never alias old puzzle states to an answer clip.
  if (/^narr-/.test(id) && !/^narr-waypoint-(yangquelong|guanshuifa|xianfahua)(-|$)/.test(id)) return []
  return Object.prototype.hasOwnProperty.call(bundled, id) ? [bundled[id]] : []
}

function clips(id) { return bundledClips(id).map(function (path) { return resources.resolve(path, 'audio') }) }
function clip(id) { return clips(id)[0] || '' }
function packageForSrc(src) { return Object.prototype.hasOwnProperty.call(pathPackages, src) ? pathPackages[src] : '' }
function packagesFor(id) {
  return clips(id).map(packageForSrc).filter(function (pkg, index, all) {
    return pkg && all.indexOf(pkg) === index
  })
}

// Bare BGM filenames remain silent until a real deployed source is supplied.
function bgm(file) {
  if (typeof file !== 'string' || !file) return ''
  if (file.charAt(0) === '/' && file.charAt(1) !== '/') return file
  if (/^https:\/\//i.test(file) && !/^https:\/\/(localhost|127(?:\.\d+){3}|\[::1\])(?=[:/]|$)/i.test(file)) return file
  return ''
}

module.exports = { AUDIO_BASE: '', clip, clips, packageForSrc, packagesFor, bgm }
