'use strict'

/**
 * V3 宿主桥接：通过 host/bridge.configure 注入，游戏不处理登录、支付或凭证。
 *
 * getContext(entry) -> {userId}：host 模式必须有稳定身份（也可由 configure 提供）。
 * loadSession({userId}) -> {snapshot,revision} | null
 * saveSession({userId,snapshot,expectedRevision,operationId})
 *   -> {acknowledged:true,revision} | {conflict:true,revision}
 *   宿主先按 operationId 去重再校验 expectedRevision；重试同一操作返原回执。
 *   snapshot 包含活动局和不递归的完成档案；缺能力只在设备保存，不声称已同步。
 * getTrustedTime({sessionId}) -> {now:毫秒,trusted:true,utcOffsetMinutes?:480}
 *   正式环境仅信此接口；demo 明示采用设备时间。成功解锁后可离线回看。
 * getLetterState({sessionId,completedAt,completedTimeSource})
 *   -> {trusted:true,available:boolean,unlockAt?:毫秒,now?:毫秒,reason?}
 *   正式环境优先此裁定接口；没有时才用 getTrustedTime 计算自然日。
 * uploadMedia({sessionId,filePath,kind,operationId}) -> {mediaId,url?}
 * claimEdition({sessionId,operationId}) -> {editionNo,scope:'global'}
 * submitContribution({sessionId,record,operationId,consent:true})
 *   -> {receiptId,status:'submitted'|'published'|'rejected',reason?}
 * getContribution({sessionId,receiptId?,operationId}) -> 同上，也允许 withdrawn
 *   支持按 operationId 找回超时丢失的投稿回执。
 * withdrawContribution({sessionId,receiptId,operationId})
 *   -> {receiptId,status:'withdrawn',acknowledged:true}
 * listContributions({sessionId,limit}) -> {items:[{id,status:'published',kind,text?,url?,from?}]}
 *   仅返回过审公开内容，不回传身份或私人稿。模块投影可展示字段。
 * onComplete({sessionId,completedAt,operationId}) -> {acknowledged:true}
 * requestReminder({sessionId,completedAt}) -> {accepted:boolean,reminderId?,reason?}
 *   accepted:true 仅表示真实受理订阅，不代表最终通知一定送达。
 * exit({sessionId,reason,completed}) -> {acknowledged:true}
 * emitEvent(event) -> void；不包含玩家正文、图片或凭证。
 *
 * 缺能力明确 unavailable；网络/无效回执明确 failed。私人稿与公开投稿独立。
 * 无上传回执的图片不投稿，无提交回执不显示审核中，不生成本地全局编号。
 */
module.exports = {
  CONTRACT_VERSION: '3.0.0',
  SESSION_SCHEMA_VERSION: 3,
  STORAGE_PREFIX: 'plate21_v3_session:',
  RECORD_STATUSES: ['draft', 'private'],
  CONTRIBUTION_STATUSES: ['submitted', 'published', 'rejected', 'withdrawn', 'failed', 'unavailable'],
  BOARD_MESSAGE_MAX_LEN: 500
}
