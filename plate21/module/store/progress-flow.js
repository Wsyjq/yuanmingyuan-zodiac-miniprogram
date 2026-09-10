'use strict'

const CHECKPOINT_ORDER = [
  'prologue',
  's1-decode',
  's2-purpose',
  's2-name',
  's2-blend',
  's2-pattern',
  's3-hour',
  's3-zodiac',
  's3-water',
  's4-timeline',
  's4-password',
  'finale',
  'report'
]

const PUZZLE_IDS = [
  'prologue-envelope',
  's1-decode',
  's2-purpose',
  's2-name',
  's2-blend',
  's2-pattern',
  's3-hour',
  's3-zodiac',
  's3-water',
  's4-timeline',
  's4-password'
]

const CHECKPOINT_ROUTES = {
  prologue: '/plate21/module/pages/prologue/prologue',
  's1-decode': '/plate21/module/pages/s1-decode/s1-decode',
  's2-purpose': '/plate21/module/pages/s2-quiz/s2-quiz',
  's2-name': '/plate21/module/pages/s2-reveal/s2-reveal',
  's2-blend': '/plate21/module/pages/s2-blend/s2-blend',
  's2-pattern': '/plate21/module/pages/s2-pattern/s2-pattern',
  's3-hour': '/plate21/module/pages/s3-comic/s3-comic',
  's3-zodiac': '/plate21/module/pages/s3-zodiac/s3-zodiac',
  's3-water': '/plate21/module/pages/s3-water/s3-water',
  's4-timeline': '/plate21/module/pages/s4-timeline/s4-timeline',
  's4-password': '/plate21/module/pages/s4-password/s4-password',
  finale: '/plate21/module/pages/finale/finale',
  report: '/plate21/module/pages/report/report'
}

Object.assign(CHECKPOINT_ROUTES,require('../config/experience').EXTRA_ROUTES)

const LEGACY_CHECKPOINT_ALIASES = {
  's2-quiz': 's2-purpose',
  's3-comic': 's3-hour'
}

function normalizeCheckpoint(value) {
  const checkpoint = LEGACY_CHECKPOINT_ALIASES[value] || value
  return CHECKPOINT_ROUTES[checkpoint] ? checkpoint : ''
}

function isValidCheckpoint(value) {
  return !!normalizeCheckpoint(value)
}

function isValidPuzzle(value) {
  return PUZZLE_IDS.includes(value)
}

function routeForCheckpoint(value) {
  return CHECKPOINT_ROUTES[normalizeCheckpoint(value) || 'prologue']
}

function inferredCheckpoint(snapshot) {
  const snap = snapshot || {}
  const puzzles = snap.puzzles || {}
  const cards = snap.cards || {}
  const flags = snap.flags || {}
  const stations = snap.stations || {}

  if (flags.experienceCompletedAt) return 'report'
  if (snap.finale) return 'report'
  if (stations.s4) return 'finale'
  if (puzzles['s4-password']) return 's4-password'
  if (puzzles['s4-timeline'] || cards['s4-timeline']) return 's4-timeline'
  if (stations.s3) return 's4-timeline'
  if (puzzles['s3-water'] || cards['s3-water']) return 's3-water'
  if (puzzles['s3-zodiac'] || cards['s3-zodiac']) return 's3-zodiac'
  if (puzzles['s3-hour'] || cards['s3-hour']) return 's3-hour'
  if (stations.s2) return 's3-hour'
  if (puzzles['s2-pattern'] || cards['s2-pattern']) return 's2-pattern'
  if (puzzles['s2-blend'] || cards['s2-blend'] || flags.s2PhotoRecord) return 's2-blend'
  if (puzzles['s2-name'] || cards['s2-name']) return 's2-name'
  if (puzzles['s2-purpose'] || cards['s2-purpose']) return 's2-purpose'
  if (puzzles['s1-decode']) return 's1-decode'
  if (stations.s1) return 's2-purpose'
  if (puzzles['prologue-envelope']) return 'prologue'
  return 'prologue'
}

function deriveCheckpoint(snapshot, options) {
  const snap = snapshot || {}
  if (snap.schemaVersion === 3 && isValidCheckpoint(snap.visitCheckpoint)) return snap.visitCheckpoint
  const recorded = normalizeCheckpoint(snap.checkpoint)
  const hasPuzzleState = Object.keys(snap.puzzles || {}).length > 0
  if (recorded && hasPuzzleState && !(options && options.preferEvidence)) return recorded

  const inferred = inferredCheckpoint(snap)
  if (!recorded) return inferred
  const recordedIndex = CHECKPOINT_ORDER.indexOf(recorded)
  const inferredIndex = CHECKPOINT_ORDER.indexOf(inferred)
  return inferredIndex > recordedIndex ? inferred : recorded
}

module.exports = {
  CHECKPOINT_ORDER,
  CHECKPOINT_ROUTES,
  PUZZLE_IDS,
  normalizeCheckpoint,
  isValidCheckpoint,
  isValidPuzzle,
  routeForCheckpoint,
  deriveCheckpoint
}
