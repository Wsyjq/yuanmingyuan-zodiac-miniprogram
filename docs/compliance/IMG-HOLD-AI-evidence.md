# IMG-HOLD-AI 逐文件证据清单

> 核验日期：2026-08-09  
> 当前状态：`hold`  
> 结论：本清单固定现有文件与弱证据，不构成商用授权确认。

## 1. 范围与复核方式

- 受控资源：`plate21/module/assets/img/` 下 35 个 AI 生成或 AI 来源 JPEG。
- 当前进入小程序包：13 个；由 `project.config.json` 的逐文件排除规则推导。
- 当前未进入小程序包：22 个；仍保留在仓库中，不得因此视为已获授权。
- 机器可读的文件归属、最终 SHA-256 和 `bundledFiles` 以 `plate21/module/assets/third-party-lock.json` 为准。
- 复核命令：`npm run audit:images`，或 `node test/audit-image-evidence.js`。
- 生成日志：`test/gen-all.log`，SHA-256 为 `92982c83d473c8daa7902ae9a361e517da203d9395884bac2f97c93bc61e8b82`。

证据等级：

- `日志+raw`：日志中有同 ID 成功记录，且 `test/gen-raw/<ID>.png` 存在。日志没有请求 ID、账号主体或原始 API 响应，只能证明本地流程线索。
- `仅raw`：只有原始 PNG，没有对应批处理任务或请求记录。
- `仅源PNG`：只有模块目录内的 PNG 前身，没有平台请求记录。

## 2. 逐文件清单

下表文件均位于 `plate21/module/assets/img/`。

| 文件 | 包状态 | 本地来源证据 | 最终 JPEG SHA-256 |
|---|---|---|---|
| `IMG-M01.jpg` | bundled | 日志+`test/gen-raw/IMG-M01.png` | `b32a0bcde52349c8d50b8dfe37b8059bb56e8c77f9c672f0d09d2edb88177893` |
| `IMG-P-WANZI.jpg` | bundled | 仅`IMG-P-WANZI.png` | `9ed05e886d47dcc0342062009dd5e8513031350db5fe7937b8f7291408419554` |
| `IMG-P01.jpg` | ignored | 日志+`test/gen-raw/IMG-P01.png` | `11619cfbf2a48f2483b7ab6e5113ccdea052ac3f3670ed3a34f9e989a2fe97bb` |
| `IMG-P02.jpg` | bundled | 日志+`test/gen-raw/IMG-P02.png` | `703ddd88f122c5b4cb67a004901cb7f903f79eb3b5fc53ef64a48180533f0703` |
| `IMG-R01.jpg` | bundled | 仅`test/gen-raw/IMG-R01.png` | `00867b1ab365d58fa9e48344d3cdc7706de03bf3a03a4ef79efbb8c8f05d6867` |
| `IMG-R02.jpg` | bundled | 仅`test/gen-raw/IMG-R02.png` | `826401afd501cd80885c04126402b702a4027657e93ed3f98096cc5c9e43d601` |
| `IMG-S1A.jpg` | ignored | 日志+`test/gen-raw/IMG-S1A.png` | `b8ab71028226bef064594267a697e4fd82e9683b36c1792e7619c3977791556e` |
| `IMG-S1B.jpg` | ignored | 日志+`test/gen-raw/IMG-S1B.png` | `3344c5d07fbd1ab87c1df52014b2ad9ff99b6552b8723ab3fdc49cd53ae26677` |
| `IMG-S2A2.jpg` | ignored | 仅`test/gen-raw/IMG-S2A2.png` | `b187d761b461ce18966077c9473c89b7485f8e42df4ce838d051d445ad30340e` |
| `IMG-S2B.jpg` | bundled | 日志+`test/gen-raw/IMG-S2B.png` | `c84fad5879a4eb8583a24675c9ff9cba4fe0f0132f1c39e5a041a9f29d028a5a` |
| `IMG-S2C.jpg` | ignored | 日志+`test/gen-raw/IMG-S2C.png` | `e991ee55685b8c53e5a695f44bc73f7ba0c32c38a958ddfb7b78d4e4290301a7` |
| `IMG-S2C1.jpg` | bundled | 仅`IMG-S2C1.png` | `8cb1c3e732c735ddb38d681f9d7bae9c4bde845b4bc79c1a9df5ac761726cb52` |
| `IMG-S2C2.jpg` | bundled | 仅`IMG-S2C2.png` | `e397dca1aac2f86a8f35c89a79418a2d00f057c5daedfc9dbc9890e1148339a4` |
| `IMG-S2C3.jpg` | bundled | 仅`IMG-S2C3.png` | `68b329d7b07b1c6d794fbbeb703757a2496e910fc7492537535c9bd9ddb1e16f` |
| `IMG-S2C4.jpg` | bundled | 仅`IMG-S2C4.png` | `69c83f06889dccfeaed11a05dd566c575c51b3220dfe92c903c61c6ba89c6a5e` |
| `IMG-S3A.jpg` | ignored | 日志+`test/gen-raw/IMG-S3A.png` | `6d34c88c5e91ab55314a0b1c86c2b352de8cc7d413113ce957216f97241b9222` |
| `IMG-S3D1.jpg` | ignored | 日志+`test/gen-raw/IMG-S3D1.png` | `6910692a7b3b60554f1f1657a87be50664ff7201c6cf883dc1d3c144a3cdcd66` |
| `IMG-S3D2.jpg` | ignored | 日志+`test/gen-raw/IMG-S3D2.png` | `85804cb7fd30395ab5e4fb162821350a12ca61a00f7fa6858e5c3f17e4eddec9` |
| `IMG-S3D3.jpg` | ignored | 日志+`test/gen-raw/IMG-S3D3.png` | `7d8200ac0e2d39bc9b24483909c132596ae3f006848be95e5335641ab1e416dc` |
| `IMG-S3D4.jpg` | ignored | 日志+`test/gen-raw/IMG-S3D4.png` | `4a3a154a70a819131ad9a8b714d6128c0c9731934bce24d451434b04edec860e` |
| `IMG-S3D5.jpg` | ignored | 日志+`test/gen-raw/IMG-S3D5.png` | `61357ca8e9387852064e04c3511ece9ba25b32d376922022a035db5be12fc77b` |
| `IMG-S3D6.jpg` | ignored | 日志+`test/gen-raw/IMG-S3D6.png` | `a5672ddb85a8957203934b5709c442e206ac981d91496552ba14dc9ab95d11be` |
| `IMG-S3E1.jpg` | ignored | 日志+`test/gen-raw/IMG-S3E1.png` | `2939573914b0952ba057b503a8980a9466e5e87174a03dc9611a9e03463ce86b` |
| `IMG-S3E2.jpg` | ignored | 日志+`test/gen-raw/IMG-S3E2.png` | `a9e8ae62b566cdbb677faac403d051e465e1519f4598d04758d7e731e8163e07` |
| `IMG-S3E3.jpg` | ignored | 日志+`test/gen-raw/IMG-S3E3.png` | `291cb85129c2ef27f52f961a9f7af7a6c8a3de0426804feb370e2af1187de6f3` |
| `IMG-S3E4.jpg` | ignored | 日志+`test/gen-raw/IMG-S3E4.png` | `c36065e260bf77143a6398ba4b6af98565087952f452705ff9500248bc31110d` |
| `IMG-S3E5.jpg` | ignored | 日志+`test/gen-raw/IMG-S3E5.png` | `7b9a4f1cfb31cd6443ab9d54cbb4d1c7255240eeefd98b27c6e29651af6625a5` |
| `IMG-S3E6.jpg` | ignored | 日志+`test/gen-raw/IMG-S3E6.png` | `df2a1d3ff4b91826c3e8c86869782f5fb76af071cf1210d69ba2c12b291b574c` |
| `IMG-S4B1.jpg` | bundled | 日志+`test/gen-raw/IMG-S4B1.png` | `36e7cf600c2a1cdf334355b15420263c3c0311f340620c3f59acdfcbfaf57634` |
| `IMG-S4B2.jpg` | ignored | 日志+`test/gen-raw/IMG-S4B2.png` | `c6d97ee3557e41557bc6297adaf244fc4d808a7e394432c73323479209bbf95f` |
| `IMG-S4B3.jpg` | bundled | 日志+`test/gen-raw/IMG-S4B3.png` | `a1762e3acb3db00500f2718ea3a40bb5d8ada36d0c8cc7463220261341a2cc73` |
| `IMG-S4B4.jpg` | bundled | 日志+`test/gen-raw/IMG-S4B4.png` | `48d9667d16fe6f303b703196663766172a9d81292ee81a5bdf4e8f826f790432` |
| `IMG-S5A.jpg` | ignored | 日志+`test/gen-raw/IMG-S5A.png` | `d2bb95ee58089d757f919c0c343a7c85adb1a7e2a78a17e32124d3ea5dd6d0af` |
| `IMG-V01.jpg` | ignored | 日志+`test/gen-raw/IMG-V01.png` | `8b8511207a885547d94fbea3c2ebb47079cd6e2abc5026e7dcc506f5f4127385` |
| `IMG-V02.jpg` | ignored | 日志+`test/gen-raw/IMG-V02.png` | `df1308a9863c36648d305b15e34cdde790edfc343b185390307f959234c39775` |

## 3. 已归档事实

- `test/gen-all-images.js` 当前使用 `https://api.gpunexus.com/v1/images/generations`，默认模型字符串为 `doubao-seedream-5-0-260128`。
- `test/gen-all.log` 记录 31 个生成成功、1 个因已存在而跳过；其中 27 个仍属于本清单当前 JPEG。
- 最终 JPEG 经过 Jimp 裁切、缩放或重压缩，不能用最终文件哈希直接反推出平台原始响应。
- `IMG-R01`、`IMG-R02` 是 AI 来源图片，不是现场实拍；文档和展示文案不得再称其为“实拍图”。

## 4. 条款核验与风险

### GPUNexus

- 当前用户协议：<https://gpunexus.com/terms>，页面标注生效日期为 2025-10-20。
- 第 2.1 条仅授予不可转让的服务访问和使用权，用于个人或所代表实体的内部业务目的。
- 第 3.4.1 条允许在合法合规前提下使用模型输出，但要求不侵犯第三方权利、履行 AI 标识义务，并遵守模型提供商的授权、使用限制和知识产权约定。
- 协议没有明确向用户转让输出所有权，也不替代底层模型提供商条款。
- 当前网页不是本项目账号点击接受时的条款快照，不能单独证明生成主体、套餐和生成请求均受该版本覆盖。

### 底层模型条款

- 参考页：<https://docs.volcengine.com/docs/85621/1536950?lang=zh>。
- 2026-08-09 的人工核验记录显示，该专用条款包含非独占、不可转让、不可再许可、限时、可撤销及地域限制等条件，并把生成内容合法使用风险留给用户。
- 当前官方页面依赖 JavaScript，仓库尚未保存生成日版本的完整条款快照。
- GPUNexus 模型别名与火山引擎具体产品、版本和条款之间没有订单或平台书面材料佐证；该页面只能作为风险线索，不能作为授权链终点。

## 5. 缺失证据

- 生成账号的实名主体及其代表本项目或项目公司的证明。
- 生成日期对应的套餐、订单、支付或发票记录。
- 每次生成的请求 ID、原始请求体、原始响应体和平台侧任务记录。
- GPUNexus 对该模型别名的底层供应商、产品版本和适用条款书面确认。
- 账号实际接受的 GPUNexus 条款版本，以及底层模型生成日条款快照。
- 提示词和输入素材均有权使用的逐项确认。
- AI 生成内容标识方案及法务/合规验收记录。

## 6. 放行条件

只有以下条件全部完成，才可由项目版权责任人将 `IMG-HOLD-AI.status` 改为 `approved`：

1. 补齐第 5 节全部证据，并保存不可变副本和 SHA-256。
2. 书面确认输出可用于当前收费、宣传、分发和闭源商业场景，且允许必要的裁切、重压缩和改编。
3. 完成适用地域、期限、AI 标识及第三方权利审核。
4. 将审批人、审批日期、适用版本和许可文件写入 `third-party-lock.json`。
5. 运行 `npm test` 和 `npm run check:commercial` 均通过。

无法补齐时，必须替换全部 13 个 bundled 文件；未进入包的 22 个文件可继续留作内部原型证据，但不得进入商业包。
