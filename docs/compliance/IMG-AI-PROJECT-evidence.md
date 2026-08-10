# 项目 AI 图片商业使用证据

> 复核日期：2026-08-11
> 当前状态：`approved`
> 适用资源：`IMG-AI-SOURCES`、`IMG-AI-RUNTIME`

## 1. 项目方确认

项目方于 2026-08-11 确认：

1. 当前锁定的 41 个源 JPEG 均由项目方使用 AI 生成，不是书格、曼彻斯特大学或其他第三方数字馆扫描。
2. 图片通过允许商业使用的 AI 平台与项目账号生成。
3. 项目方授权这些图片及其缩放、压缩衍生文件用于本项目商业生产版本。

书面工程记录位于：

- `plate21/module/assets/licenses/PROJECT-AI-ASSET-AUTHORIZATION-2026-08-11.txt`

该确认取代此前把 6 个路径归为历史扫描的内部判断。旧 `IMG-HOLD-SHUGE` 分类与证据文件已删除。

## 2. 受控范围

| 资源项 | 文件数 | 当前包状态 | 用途 |
|---|---:|---|---|
| `IMG-AI-SOURCES` | 41 | 全部 ignored | 原始生成结果与来源哈希留档 |
| `IMG-AI-RUNTIME` | 18 | 全部 bundled | 从源文件生成的生产压缩衍生图 |

每个源文件和衍生文件的最终 SHA-256 以 `plate21/module/assets/third-party-lock.json` 为准。

## 3. 衍生链

生产图片由 `test/build-runtime-images.js` 按固定最大宽度和 JPEG quality 生成，不覆盖源文件。完整映射位于 `docs/compliance/ai-runtime-manifest.json`，每一项包含：

- 源路径与源 SHA-256。
- 目标路径与目标 SHA-256。
- 输出尺寸与文件大小。
- 比例缩放和 JPEG quality 参数。

当前 18 个生产衍生文件覆盖：宿主缩略、封面、序章两图、路线图、黄花阵、莲花灯、四处拍摄参考、四种纹样、时辰漫画、雨果雕像、终章与报告主图。

实体信封、七纹样转盘和水显纸仍为线下道具；AI 图片没有恢复已删除的虚拟玩法。玩家四图报告仍只使用玩家实际拍摄内容，参考图不会替代现场照片。

## 4. 可复现命令

```powershell
npm run build:runtime-images
npm run audit:images
npm run check:commercial
npm run package:report
```

`check-third-party.js` 会验证：

- 所有受控 JPEG 均有唯一资源归属和精确哈希。
- manifest 的源文件属于 `IMG-AI-SOURCES`。
- manifest 的目标文件属于 `IMG-AI-RUNTIME`。
- 源、目标与 lock 三方 SHA-256 完全一致。
- `bundledFiles` 与 `project.config.json` 推导出的真实包状态一致。

## 5. 变更控制

新增或替换 AI 图片时必须重新取得项目方商业使用确认，更新源文件、生成脚本、manifest、lock 和本证据文件，并重新执行全部商业与包体门禁。不得直接覆盖已锁定源文件，也不得把未登记图片写入生产页面。
