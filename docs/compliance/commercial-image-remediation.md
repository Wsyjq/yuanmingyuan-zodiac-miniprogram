# 商业图片重新接入记录

> 初次隔离：2026-08-09
> 来源纠正与重新接入：2026-08-11
> 适用工程：`D:/kc/ymy`

## 1. 结论

项目方确认原 41 个 JPEG 均为项目 AI 生成图片，并授权其及衍生文件用于本项目商业生产版本。此前“35 个 AI 文件 + 6 个历史扫描文件”的分类已纠正，不再保留 `IMG-HOLD-SHUGE`。

为控制微信分包体积，生产代码不直接使用原始文件，而是使用 18 个可复现的压缩衍生文件：

| 资源项 | 文件数 | 包状态 | 状态 |
|---|---:|---|---|
| `IMG-AI-SOURCES` | 41 | 0 bundled，41 ignored | `approved` |
| `IMG-AI-RUNTIME` | 18 | 18 bundled | `approved` |

## 2. 授权与证据

- 项目方商业使用确认：`plate21/module/assets/licenses/PROJECT-AI-ASSET-AUTHORIZATION-2026-08-11.txt`。
- 综合证据：`docs/compliance/IMG-AI-PROJECT-evidence.md`。
- 源到衍生映射：`docs/compliance/ai-runtime-manifest.json`。
- 机器锁：`plate21/module/assets/third-party-lock.json`。
- 可复现脚本：`test/build-runtime-images.js`。

源文件与运行时衍生文件均固定 SHA-256。生成脚本不覆盖源文件，每个衍生文件记录源哈希、输出哈希、尺寸和 JPEG quality。

## 3. 生产接入范围

已恢复以下视觉位置：

1. 宿主模块缩略与模块封面。
2. 序章档案整理台和民国著录卡。
3. 三段站间路线图。
4. 黄花阵平面、莲花灯与四处现场拍摄参考。
5. 万字回纹及三种干扰纹样。
6. 十二时辰四格漫画与雨果雕像叙事图。
7. 终章、报告、手册缩略和报告 Canvas 导出的第二十一图。

未恢复旧五站、拆字、虚拟转盘、虚拟水显和 photo-check 页面。四图考察卡与报告照片槽仍只接受玩家实际拍摄照片。

## 4. 包体策略

18 个衍生文件合计约 577 KiB。原始 41 个文件继续由 `project.config.json` 排除，因此不会因重新接入而把完整源图带入分包。

重新生成命令：

```powershell
npm run build:runtime-images
```

## 5. 放行门槛

商业候选版本必须同时满足：

1. 项目方商业使用确认文件仍有效。
2. manifest、源文件、衍生文件和 lock 哈希完全一致。
3. 所有生产图片均属于 `approved` 资源且实际包状态与 `bundledFiles` 一致。
4. `npm test`、`npm run audit:images`、`npm run check:commercial` 全部返回 0。
5. 主包、单分包和总包均低于项目门禁。

若更换生成平台、账号、模型或任一图片，必须重新完成授权确认、衍生链和门禁验证。
