# 第廿一图 V3 · 宿主接入说明

本文对应 V3 游戏模块的实际接口。游戏以原生小程序分包接入圆明园官方小程序；本仓库未实现官方登录、支付、订单、业务服务器或审核后台。支付不是本模块的接入项。

## 1. 接入入口与职责

正式游戏入口为 /plate21/module/pages/walk/walk。作品页为 /plate21/module/pages/report/report。

官方主包只提供 App.plate21Host 配置并使用 wx.navigateTo 打开游戏。主包不可静态 require 分包里的 session、game-entry、host/bridge 或任何游戏脚本。分包进入时，utils/game-entry.js 读取 getApp().plate21Host 并配置 session；没有配置时使用 demo 模式。

宿主需要在第一次打开游戏之前完成登录和配置。game-entry.js 对同一配置对象和 identityVersion 只配置一次；账号变化时，宿主必须更换配置对象或改变 identityVersion，随后再打开游戏。分包据此清空旧内存上下文并重新取得身份，设备缓存仍按用户隔离。不能用“只调用 wx.reLaunch”代替身份隔离。

| 项目 | 游戏模块 | 官方宿主 |
| --- | --- | --- |
| 页面、剧情、玩法、进度与报告 | 已实现 | 注册分包、打开入口 |
| 设备本地记录与离线草稿 | 已实现 | 提供运行环境 |
| 用户身份与账号权限 | 读取宿主配置/回调 | 负责登录、稳定用户标识与权限验证 |
| 云端存档 | 存档协议、设备缓存、补发队列 | 实现读取、版本校验、幂等写入 |
| 图片 | 本地选图、压缩、持久保存；公开投稿前调用上传 | 实际上传、存储、访问控制与删除策略 |
| 接力内容 | 私人原稿、独立投稿副本、真实回执状态 | 审核、发布、查询、撤回与公开池 |
| 次日回信 | 校验时间、解锁、已解锁后离线回看 | 正式模式提供可信时钟 |
| 通知与版号 | 仅调用明确提供的能力 | 通知资格/发送、全局版号 |
| 支付 | 不提供 | 不属于本次模块交付 |

## 2. 最小接入示例

下面是“身份＋本地游戏＋返回宿主”的最小正式配置。它不会声称已经具备云存档、上传、审核、全局版号或订阅提醒。getCurrentOfficialUserId 是官方已有登录层的函数，需由接入方替换。

~~~js
// 官方主包 app.js。这里只使用官方主包内已有服务。
const { getCurrentOfficialUserId } = require('./services/official-account')

App({
  plate21Host: {
    mode: 'host',
    identityVersion: 1, // 官方账号变化时递增，或更换整个 plate21Host 对象
    timeoutMs: 8000,
    host: {
      async getContext() {
        const userId = getCurrentOfficialUserId()
        if (!userId) throw new Error('请先完成官方小程序登录')
        return { userId: String(userId) }
      },
      exit() {
        return new Promise((resolve, reject) => {
          wx.navigateBack({
            delta: 1,
            success: () => resolve({ acknowledged: true }),
            fail: reject
          })
        })
      }
    }
  }
})

// 官方主包入口页面：登录完成后调用。
// 不 require 分包，不手写游戏内部存档，不注入“已付费”标志。
wx.navigateTo({ url: '/plate21/module/pages/walk/walk' })
~~~

演示壳可以明确设置：

~~~js
App({ plate21Host: { mode: 'demo' } })
~~~

增加后端能力时，在同一配置的 host 中填入真实函数；下列 officialService 是官方主包内实现的服务模块，不是本仓库提供的服务器：

~~~js
const officialService = require('./services/plate21-service')

const gameConfig = {
  mode: 'host',
  timeoutMs: 8000,
  host: {
    getContext: () => officialService.getContext(),
    loadSession: input => officialService.loadSession(input),
    saveSession: input => officialService.saveSession(input),
    getTrustedTime: input => officialService.getTrustedTime(input),
    getLetterState: input => officialService.getLetterState(input),
    uploadMedia: input => officialService.uploadMedia(input),
    submitContribution: input => officialService.submitContribution(input),
    getContribution: input => officialService.getContribution(input),
    withdrawContribution: input => officialService.withdrawContribution(input),
    listContributions: input => officialService.listContributions(input),
    claimEdition: input => officialService.claimEdition(input),
    onComplete: input => officialService.onComplete(input),
    requestReminder: input => officialService.requestReminder(input),
    exit: input => officialService.exitGame(input)
  }
}
// 在首次进入分包之前赋给 getApp().plate21Host。
~~~

## 3. 配置与启动参数

| 配置 | 类型与含义 |
| --- | --- |
| mode | demo 或 host；默认 demo |
| userId | 可选稳定标识；也可由 host.getContext 返回。host 模式最终没有标识则拒绝初始化 |
| identityVersion | 宿主身份版本；同一配置对象内切换账号时必须改变这个值，触发分包重新配置 |
| host | 本文列出的能力函数集合。允许只实现部分能力，缺能力不会伪造成功 |
| timeoutMs | 单次宿主请求超时，默认 8000 毫秒 |
| resources | { audioBaseUrl?, assetBaseUrl?, overrides? }；下面说明已接入的解析规则 |
| now | 自动化测试使用的设备时钟函数；生产环境不得把它当可信时钟 |

getContext 的返回优先覆盖配置中的 userId。不要把 accessToken、手机号、真实姓名等额外身份资料放入游戏存档。由宿主服务内部持有认证状态。

| 入口参数 | 行为 |
| --- | --- |
| 无参数 | 恢复当前 V3 考察的权威断点 |
| entry=letter | 先校验来信可读性，再打开已解锁来信；参数本身不能解锁 |
| sessionId=已完成局ID | 选择自己的完成档案；不存在则显示错误 |
| from=nfc&prop=dj06 | 识别谐奇趣入口。只有 X1 已解锁/已访问时才定位到 X1；否则保留当前进度 |
| 任意页面 ID | 不能作为跳关授权。导航仍受已访问/已解锁及来信校验约束 |

现场 NFC 只尝试启动音乐；识别贴片不会标记“已听完”。无法识别时仍可直接播放或跳过。旁白音频默认关闭，玩家主动开启。

## 4. 宿主能力请求与响应

所有时间戳均为毫秒。除 emitEvent 外，宿主函数应返回 Promise 或可解析的结果；同步抛错、Promise reject、超时均按失败处理。服务成功必须满足对应回执结构。

身份配置变化会让旧队列任务和旧宿主回执以 CONTEXT_CHANGED 结束，不能将它们写入新账号。宿主后端仍需独立做身份鉴权；客户端隔离不代替服务端权限校验。

| 能力 | 请求 | 必须返回的结果 |
| --- | --- | --- |
| getContext | 游戏启动参数对象 | { userId: string } |
| loadSession | { userId } | 无存档返回 null；有存档返回 { snapshot, revision:非负整数 } |
| saveSession | { userId, snapshot, expectedRevision:number或null, operationId } | 成功 { acknowledged:true, revision:非负整数 }；冲突 { conflict:true, revision } |
| getTrustedTime | { sessionId } | { now:有效毫秒时间戳, trusted:true, utcOffsetMinutes?:480 } |
| getLetterState | { sessionId, completedAt, completedTimeSource } | { trusted:true, available:boolean, unlockAt?:毫秒, now?:毫秒, reason? }；正式来信裁定优先使用此接口 |
| uploadMedia | { sessionId, filePath, kind, operationId } | { mediaId:非空字符串, url?:string } |
| claimEdition | { sessionId, operationId } | { editionNo, scope:'global' } |
| submitContribution | { sessionId, record, operationId, consent:true } | { receiptId, status:'submitted'或'published'或'rejected', reason? } |
| getContribution | { sessionId, receiptId?:string, operationId } | { receiptId, status:'submitted'或'published'或'rejected'或'withdrawn', reason? } |
| withdrawContribution | { sessionId, receiptId, operationId } | { receiptId, status:'withdrawn', acknowledged:true } |
| listContributions | { sessionId, limit } | { items:[公开内容] }，正常空池必须返回 { items:[] } |
| onComplete | { sessionId, completedAt, operationId } | { acknowledged:true } |
| requestReminder | { sessionId, completedAt } | { accepted:boolean, reminderId?:string, reason?:string }；只有 accepted:true 算已受理 |
| exit | { sessionId, reason, completed:boolean } | 完成实际离开动作后返回 { acknowledged:true } |
| emitEvent | 精简事件对象 | 可不返回值；失败不阻断游戏 |

### 存档写入约束

服务端先按 operationId 去重，再比较 expectedRevision。相同操作重复请求必须返回原回执；不能再次创建或重复发布。expectedRevision 为 null 表示客户端没有已确认远端版本，不表示允许覆盖服务器已有记录；服务器有冲突时应返回 conflict。

snapshot.revision 是客户端本地快照版本，saveSession 返回的 revision 是宿主权威版本。两者不要混用。

客户端先保存本地；高频草稿不等待网络。后台同时最多有一个 saveSession 请求，持久队列保留首条未确认操作和最新全量快照，中间未发送的全量版本会合并。init、exit 与显式 flush 会等待同步尝试结束。错误回执、请求失败和冲突不会显示为 synced。

当前冲突处理是保留本地内容并标记 conflict，没有自动合并两台设备上的互斥进度；正式接入方需要提供冲突处理方案。宿主还应验证当前认证用户有权读写请求里的 userId/sessionId，不能只信任客户端字段。

### 媒体与资源

公开图片投稿的 record 仅包含 kind、text、真实上传回执中的 mediaId/url，不发送设备 filePath。缺 uploadMedia、上传失败或缺 mediaId 时不调用 submitContribution，私人原稿仍保留。调用方在私人记录里填入一个 mediaId 不能绕过上传回执。

本地保存使用真实 wx.saveFile 回执，返回 local。uploadMedia 返回 uploaded 仅说明已取得媒体标识，不表示内容已经公开或通过审核。

目前私人现场照片首先保存在设备，云存档里的本地 filePath 在另一台设备不能直接使用。若要提供跨设备私人照片恢复，接入方必须实现私人媒体备份、可访问引用及失效策略；仅同步 JSON 不等于已备份图片。

资源解析器 host/resources.js 已接入如下配置：

~~~js
resources: {
  audioBaseUrl: 'https://正式音频域名/game-v3',
  assetBaseUrl: 'https://正式图片域名/game-v3',
  overrides: {
    '/voice-a/dj06-xieqiqu-soundscape-30s-v2.mp3': 'https://正式音频域名/dj06.mp3'
  }
}
~~~

这些域名只是结构示意，必须替换成已部署的真实地址。解析优先级是“原完整路径的 overrides → 对应 base 加原完整路径 → 原本地路径”。例如 audioBaseUrl=https://cdn.example/game-v3 时，/voice-a/example.mp3 变为 https://cdn.example/game-v3/voice-a/example.mp3。base 不会替换或剥离 voice-a、assets、plate21/module 等路径段。

配置只接受 HTTPS 外部地址；HTTP、localhost、127.x.x.x、[::1] 配置会被忽略并回落本地路径。未知/未启用的旁白仍保持静音，overrides 不会凭空启用 manifest 中缺失的音频。已经应用解析的内容包括旁白片段、谐奇趣音乐，以及 walk 中的人像、老师信图片、图样、观察细节图和史料卡图片。其他组件资源应随发布包逐项验收；玩家本地照片不通过 CDN base 改写。

### 接力内容

submitContribution.record 结构为：

~~~json
{
  "kind": "text",
  "text": "给后来者的话",
  "mediaId": "",
  "url": ""
}
~~~

kind 支持 text、wish、photo。图片稿必须带真实 mediaId；text/wish 不能为空。游戏当前私人正文最多保存 500 个 JavaScript 字符单元。

公开列表单项结构为：

~~~json
{
  "id": "public-record-id",
  "status": "published",
  "kind": "text",
  "text": "经审核的公开记录",
  "url": ""
}
~~~

列表只展示 status=published 的条目；submitted、rejected、withdrawn、approved 或缺状态的对象都不会被当成公开记录。协议统一使用 published，不要返回旧版 approved。游戏投影可显示字段并统一显示“一位考察者”，不展示服务返回的真实姓名或 userId。

游戏不会将官方种子或本地假内容自动当作“上一位游客”。无服务是 unavailable；服务成功但没有内容是可用空池。界面应分别显示对应状态，不能由空内容触发“已读到上一位”的叙事。

getContribution 支持按 operationId 找回响应丢失的投稿回执。失败重试保留原操作 ID 和原投稿正文；不确定请求尚未确认时，不允许直接换正文重复发送。明确 rejected 后，玩家改稿可以创建新投稿操作。

撤回与删除私人原稿是独立动作。没有真实 withdrawn 回执，公开副本仍保持原状态。删除私人记录会保留其公开副本状态；无其他私人记录引用时尝试清理已保存本地图片。删除私人记录不等于服务器公开副本已经下架。

### 次日回信与完成通知

demo 使用设备时钟与北京时间自然日：当天完成后不能读信，完成日的次日 00:00 起可读。它不具备防修改设备时间的能力。

host 模式优先调用宿主 getLetterState。必须同时返回 trusted:true 与布尔 available，才能认可该裁定；该接口拒绝、失败或返回无效回执时，不会再使用设备时间越过裁定。宿主应根据权威完成记录计算状态，而非只信请求中的 completedAt。服务器已确认开放时，客户端不再自行推断开放日期。

没有配置宿主 getLetterState 时，模块采用 getTrustedTime 的等效方案，要求 trusted:true。当天可信完成时间及其自然日边界决定解锁时间。若玩家离线完成，原 completedAt 和完成档案日期保留；首次恢复可信时钟时另存 letterAnchorAt，从该可信起算日的次日起开放，避免设备时间提前解锁。

成功验证后将 letterAvailable 保存，允许离线回看。输入 entry=letter 或手工指定 LT 页不能替代验证；更后面的 LT 页仍必须已访问/已解锁。已完成档案的来信状态与新开局互相独立。

onComplete 使用固定 operationId=complete:sessionId，宿主必须幂等。游戏先持久完成档案，再调用完成通知；缺回调或失败不会撤销玩家已完成的事实。宿主不能把“没有收到回调”直接解释为该玩家没完成，可通过云存档中的完成档案核对。

### 可选订阅提醒

游戏已提供 session.requestReminder(sessionId?) wrapper，由玩家主动操作后调用 host.requestReminder({sessionId,completedAt})。未完成的局不发起请求。宿主函数负责平台授权交互、订阅资格判断和服务端登记；本仓库没有模板 ID、发送任务或调度后端。

只有宿主明确返回 accepted:true，wrapper 才返回 {accepted:true,status:'accepted'} 并存入目标档案 run.reminder；这表示已受理请求，不表示通知最终必然送达。accepted:false 对应 declined；缺能力对应 unavailable；异常或缺少 accepted 布尔值对应 failed。已受理的同一档案重复调用返回已保存的受理结果，避免重复授权请求。

宿主必须区分玩家同意、平台请求成功、服务端登记成功与最终送达。缺能力或用户拒绝时，手动回访仍可用。

## 5. 游戏内部 session API

官方主包不直接调用下面这些方法；它们供分包页面使用。

| API | 返回与约束 |
| --- | --- |
| init(entry) | Promise<snapshot>；恢复活动局，冷启动回到 resumePageId |
| getSnapshot / getRun | 当前活动局的深拷贝 |
| getArchives / getArchive(sessionId) | 完成档案深拷贝；档案不含递归 archives |
| saveRun(run, sessionId?) | 保留扩展字段并校验合法流程变化；不能伪造签名、完成或来信解锁 |
| saveDraft(pageId, patch, sessionId?) | 局部合并 uiByPage；本地持久化成功即可返回，不等远端 |
| navigate(pageId,{sessionId?}) | 只能进入已解锁/已访问页；LT 入口另外验证来信 |
| resume(sessionId?) | 返回该局唯一权威断点 |
| completePage(pageId,{assisted?,sessionId?}) | 完成当前页；辅助作答标为 assisted；回看不会改进度 |
| skipPage(pageId,{sessionId?}) | 仅允许页表指定的跳过路径 |
| sign(name) | 仅活动局 FN4；完成并创建档案，仍停在 FN4 |
| restart / reset | 开新局，保留所有完成档案；不删除旧版 storage |
| getLetterState(sessionId?) | { available, reason, timeSource, unlockAt }；缺可信时间则不可初次解锁 |
| openLetter(sessionId?) | 验证后打开 LT1；指定旧档案不替换当前活动局 |
| saveRecord(record,sessionId?) | 保存并返回私人记录；修改指定完成档案会同步更新其记录，完成日期不变 |
| updateContributionDraft(record,sessionId?) | 保存 purpose=relay、status=draft 的私人稿 |
| deleteRecord(id,sessionId?) | { deleted,publicCopyUnaffected,fileCleanup }；不假称公开内容已撤回 |
| saveMedia({filePath,upload?,...}) | local / uploaded / unavailable / failed；本地与远端成功含义不同 |
| submitContribution(recordId,{consent:true,sessionId?}) | 独立投稿副本；仅 purpose=relay 可投稿 |
| getContribution(id,sessionId?) | 最新公开回执；刷新失败不伪造新审核状态 |
| withdrawContribution(id,sessionId?) | 只有有效宿主回执才变为 withdrawn |
| listContributions({sessionId?,limit?}) | { status,items }；失败与空池分开 |
| claimEdition() | 完成后请求全局版号；返回 { status,editionNo? }，未接入不生成本地假号 |
| requestReminder(sessionId?) | { accepted,status,reason?,reminderId? }；仅真实受理回执返回 accepted:true |
| flush() | 等待后台同步的一次有序尝试；失败/冲突保留补发数据 |
| exit(reason) | 同步尝试后调用宿主退出；缺能力返回 unavailable |
| setFlag / emit / onEvent | 分包内部标记和精简事件订阅 |

记录输入：

~~~js
{
  id: undefined,              // 修改已有记录时填写
  kind: 'photo',               // photo / text / wish
  purpose: 'field',            // field 仅私人现场记录；relay 可单独同意公开
  status: 'private',           // draft / private
  filePath: '/saved/...',      // 已真实持久保存的设备路径
  text: '',
  siteId: 'maze',              // 可选现场元数据
  spot: 'dome',
  createdAt: 0                // 可选；已有记录的原创建时间不会被覆盖
}
~~~

## 6. 数据模型与状态

~~~js
snapshot = {
  schemaVersion: 3,
  sessionId, revision, userId, createdAt, updatedAt,
  run, records: [], contributions: [],
  archives: [],                // 每项是完成局快照，不再嵌套 archives
  sync: { status: 'local' }
}
run = {
  pageId: 'P1',                // 当前显示位置，可处于回看
  resumePageId: 'P1',          // 权威恢复点
  visited: { P1: true },
  unlocked: { P1: true },
  completedPages: {},
  sites: {},
  puzzles: {},
  uiByPage: {}, flags: {},
  name: '', signedAt: null, completedAt: null,
  completedTimeSource: null, editionNo: null,
  letterAvailable: false, letterOpenedAt: null, letterRead: false
}
~~~

| 对象 | 状态 | 含义 |
| --- | --- | --- |
| 谜题 | 缺省/unvisited、solved、assisted、skipped | 未做、独立完成、经辅助完成、跳过 |
| 站点 | 缺省、active、done、skipped | 未到、进行中、已看完、本次没去 |
| 私人记录 | draft、private | 编辑草稿、私人保存；不代表已经公开 |
| 投稿副本 | submitted | 已取得宿主接收回执；不等于已审核发布 |
| 投稿副本 | published、rejected、withdrawn | 宿主确认已公开、拒绝、撤回 |
| 投稿副本 | unavailable、failed | 缺能力，或请求/回执失败；私人稿保留 |
| 同步 | local、pending、synced、unavailable、failed、conflict | 设备保存、待发、已确认、能力缺失、失败、版本冲突 |
| 提醒请求 | accepted、declined、unavailable、failed | 已受理、未同意/未受理、缺能力、请求或回执失败；均不表示已送达 |

V3 设备存储命名空间为 plate21_v3_session:模式:编码后用户ID。不会读取或清除旧版 plate21_session、plate21-mainline-run。结构迁移和清理旧数据均不在自动初始化范围内。

## 7. 接入验收

至少验证下列真实行为，不能仅检查按钮存在：

1. 官方主包可打开分包并回到原入口，主包没有静态 require 分包。
2. 用户身份正确，账号变化不复用上一用户的内存或缓存；服务端拒绝越权 sessionId。
3. 断网仍可写草稿、解谜；重连按同一 operationId 补发；冲突不会静默覆盖。
4. 回看、返回、NFC 和深链不能提前开启谜底、完成页或来信。
5. 正常解谜、assisted、跳过记录准确；重载恢复断点和 UI 草稿。
6. 本地照片确实保存在持久路径；跨设备图片是否支持按实际能力说明。
7. 图片未取得上传回执时不会公开提交；空池、未接入、失败与真实 published 各有正确界面。
8. 私人保存不会自动公开；撤回要等宿主回执；已撤回内容不能继续进入公开展示池。
9. demo/host 的来信时间来源符合各自约定；成功解锁后离线可回看；重开保留旧档案。
10. 真机验证图片、旁白、NFC、切后台、权限拒绝和宿主退出。Node 测试不能代替这些平台验证。

仓库自动化覆盖：

~~~sh
node --test test/v3-session.test.js test/v3-flow.test.js test/v3-walk.test.js
~~~

### 完成后主动进入彩蛋

2026-09-25 产品更新：完成考察后，玩家可主动点击“直接进入彩蛋”，不再必须等待自然日开放。游戏通过统一 session.openBonus 开启所选已完成档案，未完成考察仍不能进入。首次主动开启以 letterTimeSource=player_choice 标识（若已按原规则开放则保留原来源），不伪造完成日或可信校时回执。宿主自然解锁与提醒接口仍用于选择次日回访的路径；该时间条件不再限制玩家主动提前阅读。
