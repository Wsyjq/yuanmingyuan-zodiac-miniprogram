/**
 * Plate21 Host Adapter 接口契约（JS / JSDoc 版）
 * 正式定义见 docs/宿主接入方案.md §3，本文件为该契约的原样 JS 转写。
 *
 * 模块（plate21/module）只认识这里定义的 8 个方法；
 * 开发期由 adapters/local-adapter.js 实现，接入期由宿主按同一契约实现。
 * 两种实现必须返回完全相同的数据结构，模块内部不写两套流程。
 */

/* ============================== 数据模型（§3.2） ============================== */

/**
 * 会话快照：模块断点恢复的唯一依据
 * @typedef {Object} SessionSnapshot
 * @property {number} schemaVersion   快照结构版本
 * @property {string} sessionId
 * @property {number} revision        乐观锁版本，宿主每次落库 +1
 * @property {string} sessionDate     本次考察锁定日期，YYYYMMDD
 * @property {string} checkpoint      最近可恢复谜题
 * @property {Object} stations        四站完成状态
 * @property {boolean} stations.s1
 * @property {boolean} stations.s2
 * @property {boolean} stations.s3
 * @property {boolean} stations.s4
 * @property {StationRecord[]} records 四份考察记录明细
 * @property {Object<string,Object>} puzzles 谜题级完成状态
 * @property {Object<string,Object>} cards 按 cardId 保存的八张日期卡
 * @property {boolean} finale         是否已看完反转揭示
 * @property {string} [name]          署名（未署名为空）
 * @property {number} [editionNo]     已领取的版本号
 * @property {Object<string,*>} [flags] 自定义标记位（如 s3Fragments 部首碎片、collectedReport 收入手册）
 * @property {number} updatedAt       服务器时间戳 ms
 * @property {number} createdAt       会话创建时间戳 ms
 */

/**
 * @typedef {Object} StationRecord
 * @property {'s1'|'s2'|'s3'|'s4'} station
 * @property {'decode'|'rubbing'|'restore'|'pattern'|'timeline'|'zodiac'|'pattern-pick'} recordType
 * @property {number} completedAt
 * @property {Object<string, *>} [payload] 站点自定义数据（如破译答案、时间轴排列）
 */

/**
 * @typedef {Object} StartSessionInput
 * @property {string} [scene] 宿主传入的来源场景值（可选，用于统计）
 */

/**
 * 进度变更：幂等 + 乐观锁
 * @typedef {Object} SessionMutationInput
 * @property {string} sessionId
 * @property {number} expectedRevision 模块持有的 revision；不一致时宿主返回最新快照，模块合并重放
 * @property {string} operationId      幂等键（uuid）；宿主对重复 operationId 直接返回原结果
 * @property {SessionCommand} command
 */

/**
 * @typedef {Object} CompleteStationCommand
 * @property {'complete_station'} type
 * @property {'s1'|'s2'|'s3'|'s4'} station
 * @property {StationRecord} record
 */
/**
 * @typedef {Object} CompleteFinaleCommand
 * @property {'complete_finale'} type
 */
/**
 * @typedef {Object} SignCommand
 * @property {'sign'} type
 * @property {string} name
 */
/**
 * @typedef {Object} SetFlagCommand
 * @property {'set_flag'} type
 * @property {string} key
 * @property {*} value
 */
/**
 * @typedef {Object} CollectCardCommand
 * @property {'collect_card'} type
 * @property {{cardId:string,position:number,digit:string,collectedAt:number}} card
 */
/**
 * @typedef {Object} CompletePuzzleCommand
 * @property {'complete_puzzle'} type
 * @property {string} puzzleId
 * @property {number} completedAt
 * @property {Object<string, *>} [payload]
 * @property {{cardId:string,position:number,digit:string,collectedAt:number}} [card] 同次原子收集日期卡
 * @property {'s1'|'s2'|'s3'|'s4'} [station] 同次原子完成站点
 * @property {StationRecord} [record]
 * @property {string} [checkpoint] 同次原子推进断点
 */
/**
 * @typedef {Object} SetCheckpointCommand
 * @property {'set_checkpoint'} type
 * @property {string} checkpoint
 */
/**
 * @typedef {Object} MigrateSnapshotCommand
 * @property {'migrate_snapshot'} type
 * @property {SessionSnapshot} snapshot
 */
/** @typedef {CompleteStationCommand|CompleteFinaleCommand|SignCommand|SetFlagCommand|CollectCardCommand|CompletePuzzleCommand|SetCheckpointCommand|MigrateSnapshotCommand} SessionCommand */

/**
 * updateSession 的显式结果。冲突不能伪装成成功。
 * @typedef {Object} SessionMutationResult
 * @property {SessionSnapshot} snapshot
 * @property {boolean} applied
 * @property {boolean} conflict
 */

/**
 * @typedef {Object} RecognitionInput
 * @property {'dashuifa'} scene 大水法残垣（实景拍照校验，可选能力）
 * @property {{filePath: string}|{base64: string}} image 宿主二选一接收
 * @property {1|2} attempt
 */

/**
 * @typedef {Object} RecognitionResult
 * @property {boolean} pass
 * @property {number} [confidence] 0–1，可选，用于宿主调阈值
 * @property {'not_target'|'too_dark'|'blurry'|'unknown'} [failReason]
 */

/**
 * @typedef {Object} SaveMediaInput
 * @property {'report'|'photo'} type 报告图或现场考察照片
 * @property {{filePath: string}|{base64: string}} image
 * @property {{name?: string, editionNo?: number, puzzle?: string, slot?: string}} [meta]
 */

/**
 * @typedef {Object} MediaReference
 * @property {string} mediaId
 * @property {string} [url]
 */

/**
 * @typedef {Object} EditionClaimInput
 * @property {string} sessionId
 * @property {string} name 玩家署名
 */

/**
 * @typedef {Object} EditionResult
 * @property {number} editionNo 全局累计第 N 版
 */

/**
 * 埋点事件（模块保证枚举只增不改）
 * @typedef {Object} ModuleEvent
 * @property {'module_enter'|'module_exit'|'puzzle_viewed'|'puzzle_attempted'|'hint_viewed'|'card_collected'|'station_completed'|'puzzle_completed'|'capability_fallback'|'photo_check'|'finale_viewed'|'report_saved'} name
 * @property {number} ts
 * @property {string} [station]   station_completed 时携带
 * @property {string} [puzzle]    puzzle_completed / puzzle_failed 时携带
 * @property {number} [attempts]  puzzle_completed / puzzle_failed 时携带
 * @property {string} [scene]     photo_check 时携带
 * @property {number} [attempt]   photo_check 时携带
 * @property {boolean} [pass]     photo_check 时携带
 */

/* ============================== 主接口（§3.1） ============================== */

/**
 * @interface Plate21HostAdapter
 *
 * 宿主适配层：模块与宿主系统之间的唯一通道。
 * 任何适配器实现（local-adapter / 宿主 adapter）都必须满足以下 8 个方法。
 *
 * getIdentity(): Promise<{userId: string, accessToken?: string}>
 *   取当前用户标识。模块进入时调用（P00 封面）。
 *   失败/未登录不阻塞游玩：reject 后模块以匿名会话继续。
 *
 * startOrResumeSession(input: StartSessionInput): Promise<SessionSnapshot>
 *   开始或恢复一次考察会话。P00 进入时调用。
 *   无历史记录 → 宿主创建新会话返回初始快照；有 → 返回最近快照（断点恢复）。
 *
 * updateSession(input: SessionMutationInput): Promise<SessionMutationResult>
 *   进度落库。每个谜题完成节点调用（幂等 + 乐观锁）。
 *   失败处理：模块本地暂存，下个节点补发；绝不阻塞玩家。
 *
 * recognizeScene(input: RecognitionInput): Promise<RecognitionResult>
 *   实景照片校验。P09 拍照验证调用，最多 2 次/场景。
 *   超时/失败：模块按"校验失败 1 次"处理；2 次未过照样放行进入互动页（不卡关）。
 *
 * saveMedia(input: SaveMediaInput): Promise<MediaReference|null>
 *   留存媒体（可选能力）。四图现场考察与保存考察报告图时调用。
 *   宿主不支持可 resolve null，模块仅跳过该功能。
 *
 * claimEdition(input: EditionClaimInput): Promise<EditionResult>
 *   领取版本号（落款"第 N 版"）。P14 署名提交时调用。
 *   失败降级：模块显示"第 — 版"，不影响署名与报告生成。
 *
 * resetSession(): Promise<SessionSnapshot>
 *   清空当前会话并返回新快照。正式宿主必须真正创建新会话，不能只清小程序 Storage。
 *
 * emitEvent(event: ModuleEvent): void
 *   埋点事件。同步、不返回；宿主可批量上报。模块保证事件枚举稳定。
 */

/** 契约版本，供 adapter 实现与契约测试引用 */
const CONTRACT_VERSION = '1.2.0'

/** 当前快照结构版本 */
const SESSION_SCHEMA_VERSION = 2

/** 八张日期卡的剧情顺序，数字从 SessionSnapshot.sessionDate 对应位置读取 */
const CARD_ORDER = [
  's2-purpose',
  's2-name',
  's2-blend',
  's2-pattern',
  's3-hour',
  's3-zodiac',
  's3-water',
  's4-timeline'
]

/** 埋点事件名枚举（只增不改） */
const EVENT_NAMES = [
  'module_enter',
  'module_exit',
  'puzzle_viewed',
  'puzzle_attempted',
  'hint_viewed',
  'card_collected',
  'station_completed',
  'puzzle_completed',
  'capability_fallback',
  'photo_check',
  'finale_viewed',
  'report_saved'
]

/** 站点 → 考察记录类型映射（四站结构：s1 西洋楼入口 / s2 黄花阵 / s3 海晏堂·大水法 / s4 雨果雕像） */
const STATION_RECORD_TYPE = {
  s1: 'decode',          // 拆信封破译
  s2: 'pattern-pick',    // 黄花阵（选择/输入/观察/花纹）
  s3: 'zodiac',          // 海晏堂·大水法（兽首回归 + 水显马首）
  s4: 'timeline'         // 雨果雕像（时间轴 + 日期密码）
}

module.exports = {
  CONTRACT_VERSION,
  SESSION_SCHEMA_VERSION,
  CARD_ORDER,
  EVENT_NAMES,
  STATION_RECORD_TYPE
}
