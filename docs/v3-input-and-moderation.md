# 输入限制与内容审核方案（V3）

2026-09-26。适用范围：`plate21/module` 游戏分包的 5 个文字输入控件及其保存/投稿链路。本方案分两部分——**客户端输入治理**（本仓库实现）与**宿主审核服务要求**（写入契约，由官方宿主实现）。服务端审核后台、内容安全 API 调用、人工审核队列均不在本仓库实现，本文只规定接口行为与验收条件，不声称已接入。

依据：微信小程序 UGC 内容安全要求（`security.msgSecCheck` 文本 2.0、`security.mediaCheckAsync` 图片/音频异步、后台内容风控自定义关键词），以及 Discourse（WatchedWords 分级处置 + Reviewable 人审队列）、OWASP 输入校验备忘录等开源项目的分层做法。

## 一、现状盘点

| 输入控件 | 位置 | 现有限制 | 缺口 |
| --- | --- | --- | --- |
| FN4 署名 | walk-content.wxml / session.js `sign` | maxlength 40；`trim().slice(0,40)`；空→"无名氏" | 无字符清洗；slice 按 UTF-16 截断 |
| X2 拼出的三个字 | walk-interaction.wxml / task-guide.js | maxlength 20；非空提示 | 无清洗；空/错提示已有区分 |
| H4 观察笔记 | walk-interaction.wxml / walk.js `onSaveNote` | maxlength 500；非空才可保存 | 无清洗 |
| LT7 接力文字 | walk-content.wxml / walk.js `saveRelayDraft`、session.js `saveRecord` | maxlength 500；`BOARD_MESSAGE_MAX_LEN: 500`；非空才可投稿 | 无清洗；无提交限频 |
| 报告补充记录 | report.wxml / report.js `onTextInput` | maxlength 500；`trim` 后 `slice(0,500)` | 静默截断（玩家无感知） |

已有的正确设计（保留不动）：

- 私人原稿先落本地，投稿走独立副本，须 `consent:true` 且图片取得真实 `uploadMedia` 回执才调 `submitContribution`（session.js `submitContribution`）。
- 投稿状态机 `submitted / published / rejected / withdrawn` + `reason`，客户端不伪造审核状态（contracts/adapter-api.js、docs/v3-host-integration.md）。
- `operationId` 幂等；失败重试不换正文；明确 `rejected` 后改稿才算新投稿。
- 公开展示统一"一位考察者"，不透出真实姓名/userId。
- 未接上传/投稿服务时只保留真实私人草稿，不显示"审核中"（README、v3-host-integration.md 既有约束）。

## 二、目标与非目标

目标：

1. 客户端输入卫生统一、可测、可复用：规范化、去不可见字符、按字符计数、显式截断提示。
2. 提交链路有节流与幂等，空/超限/非法输入有独立文案。
3. 明确宿主服务端审核要求（机器初审 + 人审抽查 + 状态回执 + 举报撤回），映射到既有状态机。
4. 全部行为进入 `npm test` 自动基线。

非目标：

- 不在本仓库实现服务端审核、敏感词最终判定、内容安全 API 调用。
- 不把本地词表做成拦截器（黑名单易绕过：拆字、形近、拼音、零宽字符）。
- 不改变剧情内容、题库判定与既有 UI 视觉。
- 不声称未经真实验证的验收（真机、微信审核后台联调另行记录）。

## 三、分层模型

| 层 | 位置 | 职责 | 本仓库 |
| --- | --- | --- | --- |
| L0 输入卫生 | 客户端 | 规范化、去不可见字符、按字符计数、长度上限、显式提示 | ✅ 实现 |
| L1 提交策略 | 客户端 | 非空/合法性校验、提交节流、consent、上传回执前置、幂等 operationId | ✅ 实现（部分已有） |
| L2 机器初审 | 宿主服务端 | 二次校验 + `msgSecCheck`（文本）+ `mediaCheckAsync`（图片）+ 自定义关键词 | 📋 契约要求 |
| L3 人工复核 | 宿主运营 | review 必审、pass 按比例抽查、审计日志 | 📋 契约要求 |
| L4 公开后处置 | 双方 | 举报、撤回、复查下架、理由回执 | 📋 契约要求 + 客户端入口 |

原则（来自 OWASP 与开源项目共识）：**客户端限制是体验不是安全**；长度/字符集校验在两端各做一遍，服务端不信任客户端；机器判定按"通过/待审/拒绝"分级，不做一刀切删除。

## 四、输入控件规则表（L0）

统一由新增 `plate21/module/utils/input-guard.js` 提供，所有控件走同一实现：

| 规则 | 说明 |
| --- | --- |
| 规范化 | `String.prototype.normalize('NFC')`（函数不存在时跳过，不报错） |
| 去控制字符 | 删除 `[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]`，保留 `\n`、`\t` |
| 去不可见字符 | 删除零宽/方向控制字符 `[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]` |
| 空白规整 | `trim`；连续空行压到最多 1 行（仅多行控件） |
| 计数 | 按 `Array.from(text).length`（Unicode 码点）计数；WXML `maxlength` 保留作 UX 上限但不作为唯一依据（其按 UTF-16 计数，emoji 占 2） |
| 截断 | 超限时截断到上限并**显式提示**（"最多 N 字，已超出部分未保存"），不做静默 `slice` |
| 单行控件 | 署名、拼字字段删除 `\n`、`\t` |

各控件参数：

| 控件 | 字段 | 上限（码点） | 行数 | 空值策略 | 越界/非法文案 |
| --- | --- | --- | --- | --- | --- |
| FN4 署名 | `name` | 40 | 单行 | 允许留白→"无名氏" | "署名最多 40 字" |
| X2 拼字 | `text` | 10 | 单行 | 必填（已有独立提示） | "答案最多 10 字，请删减后再确认。" |
| H4 观察笔记 | `note` | 500 | 多行 | 必填才可保存（已有） | "笔记最多 500 字" |
| LT7 接力 | `relayText` | 500 | 多行 | 必填才可投稿（已有） | "接力文字最多 500 字" |
| 报告补充记录 | `draftText` | 500 | 多行 | 允许只补照片（已有） | "记录最多 500 字" |

可选项（需内容侧确认后再做，不进入本轮）：X2 是"三个字"答案，可收紧为 ≤10 码点，但须与题库答案判定规则一致。

> 2026-09-26 用户已批准 X2 收紧为 ≤10 码点并"按需控制可输入字数"：WXML maxlength 由 20 改 10，`task-guide.js` 在确认答案时对超限输入给出显式提示，判定仍按既有 `envelopeAnswers` 去空白比对（内容侧核对：唯一答案"黄花阵"为 3 码点，10 码点上限不影响判定）。

## 五、客户端实现清单

### 5.1 新增 `plate21/module/utils/input-guard.js`

```js
// 对外接口（纯函数，无小程序 API 依赖，便于 node --test 直接测）
cleanLive(raw, { multiline })           // 输入过程无损清理：去控制/不可见字符 + NFC，不动空白、不改长度
clampText(raw, { max, multiline })      // 保存/确认时规整：清理 + 空白规整 + 按码点上限 -> { text, length, truncated, empty }
count(raw)                              // 按 Unicode 码点计数
sanitizeName(raw)                       // 单行 + 上限 40
truncateNotice(label, max)              // 超限提示文案（"X 最多 N 字，已超出上限，请删减后再试。"）
createRateGate({ max, intervalMs })     // 客户端防刷量节流；服务端限流仍须独立实现
// LIMITS = { name: 40, answer: 10, text: 500 }（text 取 contract.BOARD_MESSAGE_MAX_LEN）
```

### 5.2 接入点

| 文件 | 改动 |
| --- | --- |
| store/session.js `sign` | `name` 经 `sanitizeName`（去不可见字符 + 40 码点上限），空值→"无名氏" |
| store/session.js `saveRecord` | `record.text` 经 `clampText` 兜底（非 UI 调用路径；页面侧已显式提示超限） |
| pages/walk/walk.js `onInput` | 输入值经 `cleanLive`（按 key 区分单/多行），不截断、不 trim |
| pages/walk/walk.js `onSaveNote` / `saveRelayDraft` | 保存前 `clampText`；超限显式报错并阻止保存 |
| pages/walk/walk.js 提交接力 | 复用现有非空检查；加节流（5.3） |
| pages/report/report.js `onTextInput` | 输入值经 `cleanLive` |
| pages/report/report.js 添加文本记录 | `clampText` 替代 `text.slice(0, 500)`；超限显示 recordError 并阻止保存 |
| flow/task-guide.js | X2 非空提示保留；新增 >10 码点的显式提示 |

WXML 的 `maxlength` 一律保留（防误输入的 UX 上限）；X2 由 20 改为 10。校验以 guard 结果为准。

**超限策略（实现口径）**：保存/确认时超限一律"显式提示 + 阻止保存"，不做"截断保存"，避免任何静默数据丢失；存档层 `clampText` 仅作非 UI 调用的兜底。

### 5.3 提交节流（L1）

- 实现为窗口计数闸（`createRateGate`）：公开投稿 60 秒内最多 3 次，报告文本保存 60 秒内最多 5 次；命中提示"操作过于频繁，请稍候再试。"。
- 这是客户端防抖动刷量，不限制正常编辑（草稿保存不计数）；真实限流仍须服务端独立执行（见第六节）。
- 与既有 `operationId` 幂等配合：重试沿用原操作 ID 与原正文（v3-host-integration.md 既有规则，不变）。

### 5.4 明确不做

- 不在客户端做敏感词拦截（本地词表最多未来做"提示修改"，且需另行批准）。
- 不渲染任何富文本/HTML：UGC 一律 `<text>` 纯文本插值（现状即是，保持）。
- 不改 consent、上传回执前置、状态机语义。

## 六、宿主审核服务要求（L2/L3/L4，写入 v3-host-integration.md）

以下为宿主 `submitContribution` 前后必须满足的条件，按契约验收，不由本模块实现：

1. **服务端二次校验**：长度、字符集、必填；不信任客户端裁剪结果。
2. **文本机器初审**：`security.msgSecCheck`（version 2，scene 取 2 评论或 4 社交日志，按宿主场景配置），单条 ≤2500 字 UTF-8；`result.suggest` 三态：
   - `pass` → 可直接 `published`（或按比例入抽查队列）；
   - `review` → `submitted` 进人审队列；
   - `risky` → `rejected` + `reason`（含 `detail[].label` 映射的可读理由）。
3. **图片机器初审**：`security.mediaCheckAsync`（media_type=2，≤10M，公网 URL，结果 30 分钟内回调）；结果未回前公开内容保持 `submitted`，不得先展示后补审。
4. **自定义关键词**：在小程序后台"内容风控"配置项目特有词（文物名滥用、广告导流等），命中按宿主策略映射到三态。
5. **人工复核**（微信官方建议，必须落实）：`review` 必审；`pass` 按比例抽查；审核动作留审计日志（记录 ID、时间、判定、理由、审核人）。
6. **举报与复查**：新增可选能力（缺能力返回 `unavailable`，客户端隐藏入口）：

   ```
   reportContribution({ sessionId, receiptId, reason, operationId })
     -> { acknowledged: true } | unavailable | failed
   ```

   被举报内容复查后可由宿主改判 `rejected`/`withdrawn`，客户端以 `getContribution` 刷新为准，不缓存"已过审"永久有效。
7. **限流**：服务端对 `submitContribution` 按 userId 限频（建议 ≤10 条/小时），与客户端节流独立。
8. **审计与留存**：投稿正文、机器判定结果、人审结论、处置动作留档，满足小程序 UGC 类目合规留存要求。

契约版本：新增能力为可选，`CONTRACT_VERSION` 升到 3.1.0（3.x 内兼容），不破坏现有接入。

## 七、状态与文案映射

| 投稿状态 | 界面文案 | 说明 |
| --- | --- | --- |
| `draft` / `private` | "私人保存" | 绝不显示"审核中" |
| `submitted` | "已提交，等待审核" | 仅在真实收到宿主回执后显示 |
| `published` | "已公开" | 列表只展示 `published` |
| `rejected` | "未通过：{reason}" | reason 缺省时用"未通过审核"，不编造理由 |
| `withdrawn` | "已撤回" | 须有真实撤回回执 |
| 缺服务/失败 | 复用既有 unavailable/failed 文案 | 不显示任何审核语义 |

## 八、测试与验收

| 项 | 方式 |
| --- | --- |
| input-guard 单测 | 新增 `test/v3-input-guard.test.js`（node:test，自动纳入 `test:unit` 的 `test/v3-*.test.js` 通配） |
| 用例覆盖 | 零宽字符/控制字符清除、NFC、emoji 计数（码点而非 UTF-16）、单/多行、截断标记、空值策略、5 个控件参数 |
| 存档兼容 | 扩展 `test/v3-session.test.js`：清洗后不改变既有节点/记录语义；`BOARD_MESSAGE_MAX_LEN` 边界值 |
| 页面行为 | 扩展 `test/v3-walk.test.js`、`test/v3-report.test.js`：截断提示、节流、非空文案与答错文案区分（v3-experience-review.md 既有要求） |
| 自动基线 | 每阶段 `npm test` 全绿（方案提出时基线 159 项；本轮新增 17 项，验收时 176 项全通过） |
| 手工验证 | 微信开发者工具模拟器检查输入、截断、投稿状态文案 |
| 真机/联调 | iOS/Android 真机输入法行为、宿主审核服务联调**另行记录**；不以 Node/模拟器结果冒充 |

## 九、分阶段 Git 提交（已完成）

1. **阶段 1** `8e2a4fe`：`input-guard.js` + 5 个控件接入（替换裸 slice，X2 上限 20→10）+ `test/v3-input-guard.test.js` + 既有测试补断言。
2. **阶段 2** `81e3d29`：提交节流 + 超限显式提示并阻止保存 + 对应测试。
3. **阶段 3**（本次提交）：`v3-host-integration.md` 增补"内容审核要求（宿主服务端）"章节 + `reportContribution` 可选能力契约（`CONTRACT_VERSION 3.1.0`）+ 客户端举报入口（缺能力隐藏）+ 对应测试。

每阶段独立提交，`npm test` 全绿后进入下一阶段；基线标签 `checkpoint/input-safety-start` 指向改动前提交，既有 `checkpoint/`、`backup/` 标签未改动。

## 十、落地状态（2026-09-26）

- 客户端 L0/L1 全部落地：`plate21/module/utils/input-guard.js` 为唯一清洗/计数/节流实现，5 个控件（FN4 署名、X2 拼字、H4 观察笔记、LT7 接力、报告补充记录）全部接入。
- X2 按用户决定收紧为 ≤10 码点（maxlength 20→10 + 确认时显式提示）。
- 超限策略为"显式提示 + 阻止保存"，无静默截断；存档层 `clampText` 仅兜底。
- 宿主契约 `CONTRACT_VERSION` 升至 3.1.0：新增可选能力 `reportContribution`，walk 投稿区提供举报入口（缺能力隐藏），举报不改写本地投稿状态。
- L2/L3/L4 落地责任在官方宿主：要求已写入 `docs/v3-host-integration.md`"内容审核要求（宿主服务端）"章节，**本仓库未接入任何内容安全服务，不声称已具备审核能力**。
- 手工验证边界：本轮仅 Node 自动测试（`npm test` 176 项通过）；微信开发者工具模拟器输入与举报入口、真机输入法行为、宿主审核服务联调均未在本轮执行，不以 Node 结果冒充。

## 十一、风险与边界

- 本地清洗挡不住有意绕过，安全边界始终在服务端；本方案客户端部分解决的是"误输入、脏字符、截断无感知、刷量"。
- `maxlength` 与码点计数不一致是微信控件固有行为，只能以 guard 兜底并提示，无法完全消除差异。
- 图片审核是异步（最长 30 分钟），公开前必须保持 `submitted`，避免"先展示后补审"的合规风险。
- 本方案落地后仍需微信小程序 UGC 类目审核材料：内容安全接口调用成功录屏 + 服务截图（微信审核明确要求过）。
