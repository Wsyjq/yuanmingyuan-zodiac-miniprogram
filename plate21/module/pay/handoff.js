'use strict'

// 支付解锁后的页号。不调用 wx，不写 Run。
// 旧门页解锁后去 cover；按分页，成功后的页号只有序章 P1。
function nextAfterUnlock(entitlement) {
  if (!entitlement || entitlement.unlocked !== true) {
    return { ok: false, reason: 'locked' }
  }
  return { ok: true, pageId: 'P1' }
}

module.exports = { nextAfterUnlock }
