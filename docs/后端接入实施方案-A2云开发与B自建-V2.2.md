# 后端接入实施方案：A2（云函数·宿主云开发）与 B-并入（自建服务器）

> 版本：v1.0.0 · 日期：2026-09-18 · 状态：外发首版
> 面向对象：**宿主小程序的管理员与后端研发**（另供我方实施对照）
> 与《完全接入对接文档-V2.2.md》的关系：A1 文档已覆盖工程接入、平台配置、验收（CT-01~23）、
> 降级总表等**全部共同部分**；本文只写"Adapter 背后那层"换成云开发或自建时的**增量步骤与细节**。
> 契约权威文件不变：`plate21/module/contracts/adapter-api.js`（**v1.4.0 · 12 方法**，含门票
> requestPayment/checkEntitlement 与留言簿 submitBoardMessage/listBoardMessages）。

---

## 0. 摘要（一页看懂）

**本文是什么**：《完全接入对接文档》的主线 A1 要求宿主自写后端（12 个方法，约 1.5–2.5 人日）。若宿主无此后端人力，**A2 是首选替代**：我方把后端写成云函数，部署到宿主名下的微信云开发环境——宿主的全部投入是**管理员约 0.5 小时**（开通 + 授权）加支付商户号确认，2–4 天启用，宿主既有系统**零改动**。

**分工**：

| 我方负责 | 宿主负责 |
|---|---|
| 云函数与 cloud-adapter 的全部开发（2–3 天） | 开通云开发、创建环境、交付环境 ID（管理员 0.5 小时） |
| 部署、联调、CT-01~23 验收执行 | 把我方人员加为开发者（项目成员） |
| BGM 上传云存储、AUDIO_BASE 切换 | （启用门票）微信支付商户号关联云开发 |
| 后续内容迭代的函数版本发布 | 留言审核人力（先审后发，量级可控） |
| | 云开发费用（按量，约 19.9 元/月起）与计费告警 |

**调用链**（全部在宿主 AppID 体系内，不新增域名与服务器）：

```
小程序业务分包 → cloud-adapter（wx.cloud.callFunction）→ 云函数 plate21-adapter
                                                      ├→ 集合（会话/订单/留言/事件/幂等键）
                                                      ├→ 云存储（BGM 13 首）
                                                      ├→ 微信支付统一下单（形态 A 时）
                                                      └→ msgSecCheck 云调用（留言机检）
```

**本文待双方确认的清单**（A2 特有；主文档 §0 讨论清单仍然全部适用）：

| # | 事项 | 要点 | 拍板时点 |
|---|---|---|---|
| 1 | 环境 | 云开发环境创建与环境 ID 交付；建议测试/正式两套（§1.4-4） | 启动时 |
| 2 | 授权 | 我方部署人员微信号名单（建议 ≥2 人，人员变动宿主更新） | 启动时 |
| 3 | 商户号 | （启用门票）商户号关联云开发；建品/搭售口径见主文档讨论清单 #2 | 联调前 |
| 4 | 审核制度 | 留言先审后发的人力与时效承诺；下架流程（§1.3 审核后台） | 上线前 |
| 5 | 费用 | 云开发计费告警阈值（防 BGM 下载流量意外放大） | 启动时 |
| 6 | 对接人 | 复用主文档 §7.4 联系人表 | 首次对接会 |

### 0.1 三方案总览与选型

| | A1 宿主自实现 | **A2 云函数·宿主云开发** | **B-并入 自建服务器** |
|---|---|---|---|
| 谁写后端 | 宿主 | **我方** | **我方** |
| 谁运维/付费 | 宿主 | 宿主（云开发按量，约 19.9 元/月起） | 我方（服务器+域名+人力） |
| 宿主工作量 | 后端 1–2 人日 | **管理员约 0.5 小时**（开通+授权） | 管理员加两条合法域名 |
| 启用周期 | 排宿主研发档期 | **2–4 天** | **域名备案 2–4 周**（最长杆） |
| 登录/鉴权 | 宿主登录体系 | **免（云函数直取 OPENID）** | **硬坑**（见 §2.1-5） |
| BGM 32MB | 宿主 CDN | **宿主云存储（免合法域名）** | 我方备案域名 |
| 门票付费 | 宿主付费工程（复用） | **云函数统单，走宿主商户号** | **必须宿主商户号**（AppID 归宿主），我方服务器只记订单 |
| 内容安全（留言簿已启用） | 宿主义务 | 云调用 msgSecCheck，顺手 | **义务在我方且无现成接口** |
| 适用前提 | 宿主有后端团队 | 宿主肯开云开发 | 仅当其余全部不可行 |

**选型一句话**：并入且宿主无后端人力 → A2；B-并入只在"宿主连云开发都不肯开、且必须要后端能力"时才值得。

---

## 1. 方案 A2：云函数版 Adapter，部署到宿主云开发环境

### 1.1 前置条件（宿主侧四件事，管理员约 0.5 小时）

1. **开通云开发**：小程序后台 → 云开发 → 创建环境（按量付费，选最低档即可，以腾讯云现行价格为准）→ 记录**环境 ID**（形如 `plate21-xxxx`）；
2. **授权我方部署**，二选一：
   - 推荐：成员管理 → 把我方人员微信号加为**开发者（项目成员）**——我方用宿主 AppID 在开发者工具里打开交付工程即可部署云函数/传云存储；
   - 备选：云开发控制台的协作者/成员方式（环境级授权）；
3. **计费告警**：腾讯云费用中心设余额/账单阈值提醒（防 BGM 流量意外放大）；
4. **（启用门票时）微信支付与商品**：①确认宿主商户号已绑定该小程序 AppID 且类目可售线下票务；②**支付形态二选一**（口径见 A1 文档 §0 讨论清单 #2）：形态 A＝云函数统单（本方案默认实现）／形态 B＝跳宿主现有收银台（宿主已有购票工程时推荐，云函数只做回跳后查单）；③**建品方式二选一**：单独 SKU `plate21_full` 在宿主商品库建品，或权益搭售既有票务订单（`entitlement` 直接查宿主票务系统，免建 SKU）；模块零金额逻辑，门页价格文案由双方确认后我方定版。

### 1.2 实施步骤（我方 2–3 天开发 + 0.5–1 天联调；含门票统单与留言审核队列）

**① 工程结构**（挂在宿主 AppID 的交付工程内新增）：

```
cloudfunctions/
  plate21-adapter/          # 单函数多 action（推荐，省冷启动）；依赖 wx-server-sdk
小程序端
  plate21/module/adapters/cloud-adapter.js   # Host Adapter 云版实现
数据库集合（云开发控制台建，字段级结构见 §1.3）
  plate21_session           # 一条/用户，存 SessionSnapshot 原样 JSON
  plate21_events            # emitEvent 落库（或先只打日志）
  plate21_order             # 门票订单与权益（refund 置 unlocked=false 收回）
  plate21_board             # 留言：reviewing|accepted|rejected 状态列区分待审与过审池
  plate21_applied           # updateSession 幂等键（operationId → 首次结果）
```

**② 云函数要点**（单函数 action 路由：`start` / `update` / `reset` / `identity` / `event` / `entitlement` / `pay` / `board_submit` / `board_list` / 可选 `media`）：

- 身份：`cloud.getWXContext().OPENID` 直接取稳定用户标识——**A2 的最大红利：整个登录鉴权流程消失**。`getIdentity()` 实现为一次轻量 callFunction 返回 `{ userId: OPENID }`；
- `start`：按 OPENID 查 `plate21_session` 最近一条；无则建初始快照（`schemaVersion:2, revision:0, checkpoint:'prologue', 四站 false`）；
- `update`：**operationId 幂等**（已应用过的 operationId 直接返回首次结果，revision 不再 +1）+ **revision 乐观锁**（不匹配返回最新快照 `conflict:true`）；8 种命令按"应用变更→整包写回"处理；
- `entitlement` / `pay`：门票两方法。`pay` 在云函数内统单（云开发支持云支付/商户号统一下单，**需宿主微信支付商户号绑定该 AppID**）；支付回调确认后写 `plate21_order` 权益；iOS 虚拟支付受限等场景直接返回 `unavailable`（门页自动隐藏购买入口）；`entitlement` 按 `plate21_order` 返回 `{unlocked}`（放行口径与退款收回边界见 A1 文档 §4.2）。变体：若走形态 B（跳宿主收银台），`pay` 改为返回收银台跳转参数、回跳后查单，云函数不碰统单；搭售模式下 `entitlement` 改查宿主票务订单；
- `board_submit` / `board_list`：留言两方法。提交即调 `cloud.openapi.security.msgSecCheck` 机检 → 入 `plate21_board` reviewing 队列（先审后发）→ 人工在控制台/后台过审转 accepted；展示池只回 accepted，署名一律「一位考察者」；
- 集合安全规则：设为**仅云函数可读写**（客户端一律走函数，不直连数据库）。

**③ 小程序端 `cloud-adapter.js`**：结构与 `local-adapter.js` 逐字段一致；`wx.cloud.init({ env: '<环境ID>' })` 在 adapter 内**惰性初始化**（不污染宿主 app.js）；各方法封装 `wx.cloud.callFunction`。挂载方式与 A1 相同：`store/session.js` 换 adapter 引用一行。

**④ BGM 上云存储**：交付包 `bgm/` 13 首 → 云存储 `plate21/bgm/` 目录。取流二选一（**联调时实测定案**）：
- 方式 a（稳妥）：进入模块时 `getTempFileURL` 批量换真实 URL 并缓存，临时链接有时效（小时级），过期自动刷新——AUDIO_BASE 逻辑改为缓存层；
- 方式 b（若支持则最简）：音频组件直接使用 `cloud://` fileID——需真机实测 InnerAudioContext 的支持度。
云存储文件**不走 downloadFile 域名校验**，合法域名一条都不用配。

**⑤ 联调验收**：开发者工具云函数本地调试 → 按部署核对清单逐项核对（§1.3）→ 真机跑 CT-01~23（重点 CT-02 匿名 / CT-05~07 幂等与乐观锁 / CT-13 重置 / CT-14 完成态 / CT-17 支付 paid / CT-20 unavailable / CT-22 留言三态）→ 复用 A1 文档 §7.2 集成回归清单。

**⑥ 上线**：云函数发布正式版（云函数支持版本与灰度流量）；隐私保护指引补两条声明——**位置信息**（原有）+ **考察进度数据（含 OpenID）收集**。

### 1.3 A2 实现参考（骨架与集合结构；交付包内为完整实现）

**集合字段级结构**（5 个，均建索引于 `_openid`）：

```
plate21_session   { _openid, session: SessionSnapshot整包JSON, revision, updated_at }
plate21_events    { _openid, event: ModuleEvent原样(name/ts/…), created_at }
plate21_order     { _openid, order_id(唯一), sku:'plate21_full', status:'paid'|'refunded',
                    entitlement_id, created_at, refunded_at }
plate21_board     { _openid, text(≤50字), status:'reviewing'|'accepted'|'rejected',
                    machine_check(msgSecCheck结果留存), display(过审后:{text,from,date,source}),
                    created_at, reviewed_at }
plate21_applied   { _id=operationId, result(首次结果原样), at }
```

安全规则：五个集合全部设为**禁止客户端读写**（自定义规则 `{"read": false, "write": false}`）——云函数以管理权限访问，不受安全规则限制；客户端一律走函数，不直连数据库。

**云函数骨架**（单函数 action 路由；`config.json` 需声明云调用权限 `"openapi": ["security.msgSecCheck"]`）：

```js
// cloudfunctions/plate21-adapter/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()          // A2 最大红利：鉴权到此为止
  switch (event.action) {
    case 'identity':     return { userId: OPENID }
    case 'start':        return startOrResume(OPENID)
    case 'update':       return update(OPENID, event.input)
    case 'reset':        return reset(OPENID)
    case 'entitlement':  return entitlement(OPENID)
    case 'pay':          return pay(OPENID, event.input)
    case 'board_submit': return boardSubmit(OPENID, event.input)
    case 'board_list':   return boardList(event.input)
    case 'event':        return saveEvent(OPENID, event.input)
  }
}

// updateSession 的两个硬语义：幂等 + 乐观锁
async function update(openid, input) {
  const first = await db.collection('plate21_applied').doc(input.operationId)
    .get().then(r => r.data).catch(() => null)
  if (first) return first.result                          // 幂等重放：返回首次结果
  const row = (await db.collection('plate21_session')
    .where({ _openid: openid }).get()).data[0]
  if (!row || row.session.revision !== input.expectedRevision)
    return { snapshot: row.session, applied: false, conflict: true }   // 乐观锁
  const next = applyCommand(row.session, input.command)   // 8 种命令统一"改快照"，不解析业务
  next.revision += 1
  await db.collection('plate21_session').doc(row._id)
    .update({ data: { session: next, revision: next.revision, updated_at: Date.now() } })
  const result = { snapshot: next, applied: true, conflict: false }
  await db.collection('plate21_applied').add({ data: { _id: input.operationId, result, at: Date.now() } })
  return result
}
```

**留言机检**（board_submit 核心，云调用免 access_token）：

```js
const check = await cloud.openapi.security.msgSecCheck(
  { version: 2, openid, scene: 2, content: input.text })
if (check.result.suggest !== 'pass')
  return { status: 'rejected', reason: '这条话不能展示，改一句再投' }
// → 入 plate21_board（status:'reviewing'，留存 machine_check）→ 返回 { status:'pending_review' }
// 人工过审：status→'accepted' 并填 display{from:'一位考察者', date:'YYYY.MM.DD', source:'user_generated'}
```

**审核后台最小方案（零开发起步）**：云开发控制台 → 数据库 → `plate21_board` → 筛选 `status=reviewing` → 人工核对 `text` 与 `machine_check` → 改 `status` 并填 `display`。后续如量级上来，再用云开发静态托管做一个简单审核页。

**小程序端 cloud-adapter 骨架**（结构与 local-adapter 逐字段一致）：

```js
// plate21/module/adapters/cloud-adapter.js
let inited = false
function call(action, input) {
  if (!inited) { wx.cloud.init({ env: '<环境ID>' }); inited = true }   // 惰性初始化，不污染宿主 app.js
  return wx.cloud.callFunction({ name: 'plate21-adapter', data: { action, input } })
    .then(r => r.result)
}
module.exports = {
  getIdentity:           () => call('identity'),
  startOrResumeSession: (i) => call('start', i),
  updateSession:        (i) => call('update', i),
  resetSession:          () => call('reset'),
  checkEntitlement:     (i) => call('entitlement', i),
  requestPayment:       (i) => call('pay', i),
  submitBoardMessage:   (i) => call('board_submit', i),
  listBoardMessages:    (i) => call('board_list', i),
  emitEvent: (e) => { call('event', e).catch(() => {}) },               // 不抛错
  saveMedia: () => Promise.resolve(null)
}
```

**部署核对清单**（我方执行，宿主可逐条核对）：

1. 宿主侧：开通云开发 → 记录环境 ID → 我方人员加为开发者（§1.1）；
2. 我方在开发者工具（宿主 AppID 交付工程）上传 `cloudfunctions/plate21-adapter`；
3. 控制台建 5 个集合（§1.3 结构）＋ 安全规则全锁；
4. （启用门票）云开发控制台 → 微信支付 → 关联宿主商户号，`pay` 走统一下单；
5. BGM 13 首上传云存储 `plate21/bgm/`，AUDIO_BASE 切临时链接缓存层（§1.2-④）；
6. 测试环境跑 CT-01~23（重点 CT-02/05/06/07/13/14/17/22）；
7. 云函数发布正式版（支持版本与灰度流量），隐私指引补「考察进度数据（含 OpenID）」声明。

### 1.4 A2 细节与坑清单

| # | 事项 | 处理 |
|---|---|---|
| 1 | 计费模型 | 小流量约几十元/月；大头是云存储下载流量（46MB/全量用户），设告警阈值 |
| 2 | 临时链接时效 | tempFileURL 小时级有效，必须缓存+过期刷新，不能写死 |
| 3 | 云函数冷启动 | 首调几百毫秒；模块进入时预热一次（identity 调用即预热） |
| 4 | 环境隔离 | 建测试/正式两套环境，环境 ID 是 adapter 内常量，一处切换 |
| 5 | 留言内容审核（已启用） | 云函数内 `cloud.openapi.security.msgSecCheck` **云调用免 access_token**，机检现成（义务仍随数据归宿主）；明信片若启用真实收集同口径 |
| 6 | 数据归属与导出 | 数据在宿主 AppID 名下，宿主控制台随时导出；我方被移除成员权限即失去访问——权责边界天然清晰 |
| 7 | 权限变动 | 我方人员变动需宿主更新成员名单（建议我方至少 2 人在列） |
| 8 | 结构升级 | `schemaVersion` 2→3 时，`migrate_snapshot` 命令在云函数内同步实现，随函数版本发布 |
| 9 | 基础库 | 云开发要求基础库 ≥ 2.2.3（本项目要求 2.30.0，天然满足） |
| 10 | 门票统单 | 云函数统单需宿主商户号绑定该 AppID；金额在宿主商品库，模块零金额逻辑（A1 §4.2）；iOS 虚拟支付受限时返回 unavailable，门页自动隐藏购买 |
| 11 | 留言审核时效 | 先审后发模式下玩家当场看不到自己的话上墙（pending_review 为正常态，模块有对应文案）；需宿主排审核人力 |

---

## 2. 方案 B-并入：自建服务器（最后手段，周期最长）

### 2.1 实施步骤

1. **域名**：购买 + 实名（约 60 元/年）；子域规划 `api.` 与 `cdn.`；
2. **ICP 备案**：以我方主体提交，**2–4 周**——整条路的 critical path，第一天就启动；备案期间域名不可对外服务（区分两种"备案"：**小程序 ICP 备案**是 2023-09 起的上线硬门槛、责任在小程序主体、A2/B-并入都逃不掉；**服务器域名备案**仅本方案自建需要，云开发形态免）；
3. **HTTPS**：免费证书即可（Let's Encrypt / 云厂商免费证书），注意自动续期；
4. **服务端**：3 个接口（start / update / reset）+ 事件接收端点 + 可选媒体上传；存储 SQLite/MySQL 均可起步（快照 JSON 一张表）；建议直接复用 A2 的 action 路由设计，未来可平滑迁回云开发；
5. **鉴权（并入场景的硬坑，三选一）**：
   - a. 依赖宿主登录：`getIdentity` 返回宿主 `accessToken`，我方接口验签——**需要宿主提供验签方式**（公钥或校验接口），等于又拉宿主进配合范围；
   - b. 匿名 UUID：客户端自造标识——可伪造，只配统计、不配正式计数；
   - c. **拿宿主 AppID secret 自行 code2Session 换 OPENID——做不到**（宿主不会交出 secret）。
   > 结论：B-并入的身份可信度绕不开宿主，这是它"并不比 A2 省事"的根源。
6. **合法域名**：宿主小程序后台 `request` 与 `downloadFile` 各加我方域名（HTTPS+已备案即可，**不要求与小程序主体一致**）；
7. **BGM 同域上架**（`cdn.` 子域，与接口同备案主体一次搞定）；
8. **门票支付（启用付费时）**：AppID 归宿主，微信支付商户号**必须宿主提供并绑定**——我方服务器只做订单记录与权益查询，`requestPayment` 走**形态 B（跳宿主收银台页）**最省事，回来查单确认返回四态（paid/cancelled/failed/unavailable）；（形态选择与搭售口径见 A1 文档 §0 讨论清单 #2）；
9. **内容安全（留言簿已启用）**：留言提交经我方服务器，但我方无宿主 access_token，调不了微信内容安全接口——需自购第三方文本审核或由宿主代审；**UGC 审核义务在我方**（明信片收集仍为本地模拟，不涉及）；
10. **运维清单（持续）**：接口监控告警、日志留存、数据库每日备份、证书自动续期、限流防刷（匿名接口必须加频控，按 IP+userId 双维度）、容量水位。

### 2.2 B-并入的坑清单

| # | 坑 | 说明 |
|---|---|---|
| 1 | 备案空窗 2–4 周 | 期间无法联调外网接口，先用本机/内网开发，域名生效后切 |
| 2 | 身份不可信 | 见 §2.1-5；统计数字可被刷，对外披露口径要留余地 |
| 3 | UGC 义务独立承担 | 与 A2（宿主义务+现成审核）形成最尖锐对比 |
| 4 | 运维人力 | 7×24 故障响应、证书/备份/扩容——"完全不承担运维"在这条路彻底失效 |
| 5 | 迁移成本 | 若日后想迁回云开发：接口语义已按契约对齐，迁的是部署形态不是业务逻辑，成本可控（当初按 action 路由设计的好处） |

> 本方案保持决策与风险层；若双方选定走 B-并入，我方再提供详细设计（接口清单、表结构、部署拓扑、鉴权验签方案），深度对齐 A2 的实现参考级。

---

## 3. 决策速查

- 宿主**有**后端团队、要数据进自己体系 → **A1**（见《完全接入对接文档-V2.2.md》）；
- 宿主**没有**后端人力、肯开云开发 → **A2**（本文 §1，2–4 天启用）；
- 其余全部不可行时 → **B-并入自建**（本文 §2，先启动域名备案）。

> 三方案共用：契约文件（v1.4.0 · 12 方法）、CT-01~23 验收、降级总表、工程接入与平台配置（均见 A1 文档）。
> 门票付费与留言簿 UGC 的契约语义、商户号与审核的平台配置项见 A1 文档 §4 / §6。
> 后端形态之间可后置切换（adapter 可替换），**先零后端上线、后按需升级**始终成立。

---

## 附录：A2 常见问题（FAQ）

**Q1：数据存在哪？我们怎么导出？**
全部在宿主 AppID 名下的云开发环境（集合见 §1.3），宿主在云开发控制台可随时导出；我方被移除成员权限即失去访问——权责边界天然清晰。

**Q2：费用大概多少？**
云开发按量计费，小流量约 19.9 元/月起；大头是 BGM 云存储下载流量（全量资产约 46 MB × 用户数），在腾讯云费用中心设阈值告警即可（§0 确认清单 #5）。

**Q3：为什么必须部署到我们的云开发，而不是你们自己的服务器？**
技术必然：`wx.cloud.callFunction` 只能调用当前小程序 AppID 名下环境的云函数，且免鉴权取 OPENID 仅在同主体环境内成立。若一定要走我方自建服务器，即本文 §2 的 B-并入形态——周期（域名备案 2–4 周）与成本都高得多，仅作最后手段。

**Q4：用户退款怎么处理？**
退款在宿主商户号侧完成，云函数把对应订单置 `refunded`，`checkEntitlement` 即返回 `unlocked:false`；收回在用户本地缓存未命中的下一次查询时生效（口径见主文档 §4.2）。

**Q5：留言审核要投入多少人力？**
机检（msgSecCheck）是云函数内自动调用，无人力成本；人工先审后发，单条上限 50 字、只有通关用户能写，量级可控。审核操作零开发起步：控制台改 `status` 字段（§1.3 审核后台最小方案）。

**Q6：云函数出了问题谁修？**
我方负责（成员权限内即可发布函数新版本，支持灰度）；宿主可随时收回成员权限自主控制访问。
