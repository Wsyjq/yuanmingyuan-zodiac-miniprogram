'use strict'

function prefersReducedMotion(api) {
  const runtime = api || (typeof wx !== 'undefined' ? wx : null)
  if (!runtime) return false
  try {
    const settings = typeof runtime.getSystemSetting === 'function'
      ? runtime.getSystemSetting()
      : typeof runtime.getSystemInfoSync === 'function'
        ? runtime.getSystemInfoSync()
        : null
    return !!(settings && settings.reduceMotionEnabled)
  } catch (error) {
    return false
  }
}

module.exports = { prefersReducedMotion: prefersReducedMotion }
