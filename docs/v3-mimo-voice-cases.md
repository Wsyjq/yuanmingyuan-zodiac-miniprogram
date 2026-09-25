# MiMo 叙事录音生成案例

日期：2026-09-25。本轮只生成供确认的音色与演出案例，不接入运行时播放，不修改 `audio/v3-manifest.js`、`narrationPending` 或发布资源。

## 模型与工具

- 模型：`xiaomi-token-plan-cn/mimo-v2.5-tts-voicedesign`
- 接口：小米 Token Plan OpenAI 兼容 `chat/completions`
- 工具：`tools/generate-mimo-voice.js`
- 提示词：`tools/voice-prompts/v3-mimo-voices.json`
- 源稿：`plate21/module/content/story.js`；LT1—LT8 使用 `flow/letter-paragraphs.js` 的语义段落合并
- 输出：`docs/compliance/sources-audio/mimo-v3/cases/`
- 发布格式：WAV 生成后统一转为 MP3，24 kHz、单声道、64 kbps

`opencode run` 不能直接用于该 TTS 模型，因为运行时会自动加入系统消息，而小米 TTS 接口拒绝 `system` role；本轮改用同一 Token Plan 凭据的直接兼容 API。工具只读取 `MIMO_API_KEY` 环境变量，不保存或输出明文凭据。

## 音色方案案例

四条使用同一 P1 第一段正文，只改变声音设计：

| 方案 | 文件 | 设定 |
|---|---|---|
| A | `voice-scheme-A.mp3` | 28—32 岁普通话女声，温暖、清澈、略低，博物馆亲历者感 |
| B | `voice-scheme-B.mp3` | 25—28 岁中性偏女声，清朗、明亮、探索感 |
| C | `voice-scheme-C.mp3` | 35—45 岁中性偏男声，低沉、稳重、纪录片感 |
| D | `voice-scheme-D.mp3` | 45—55 岁中性偏女声，温厚、松弛、长辈书信感 |

主方案为 A，其他方案只用于对比，不进入项目资源。

## 演出案例

使用 A 音色，覆盖五类关键情绪：

| 节点 | 文件 | 演出重点 |
|---|---|---|
| P1 | `perf-A-P1-01.mp3` 至 `perf-A-P1-03.mp3` | 档案整理转好奇，发现纸片与决定求证 |
| LT2 | `perf-A-LT2-01.mp3`、`perf-A-LT2-02.mp3` | 老师书信、回忆安排、温和坦白 |
| HY2 | `perf-A-HY2.mp3` | 复原想象回到遗址，兽首流散的低沉对照 |
| DS2 | `perf-A-DS2-01.mp3` 至 `perf-A-DS2-03.mp3` | 猎狗逐鹿的热闹转回遗址沉默与失去 |
| HG1 | `perf-A-HG1-01.mp3`、`perf-A-HG1-02.mp3` | 旧图、遗址与雨果书信的庄重叙述 |

小米单次生成实测约 60 秒上限；为避免尾句截断，工具按完整句和段落边界切成不超过 160 字的连续片段。每组多段文件应按编号顺序连续播放，拼接文本与原节点正文逐字一致。

## 元数据与复核

- `manifest-voices.json`：四条音色案例
- `manifest-performance.json`：五条演出案例
- 每条案例另有同名 `.json`，记录节点、提示词、原文、原文 SHA-256、请求 ID、模型用量、WAV/MP3 路径与 SHA-256。

自动复核已完成：

- 所有案例 MP3 均为 24 kHz 单声道。
- 各组片段拼接文本与原节点正文逐字一致。
- WAV/MP3 文件均存在并有 SHA-256。
- `npm test` 159 项通过，`npm run check:story` 通过，包体总计 6.67 MiB。

## 当前边界

本轮**没有实际试听**任何生成音频，不能判断音色、断句、尾音、情绪或专有名词是否正确，也不宣称听审通过。案例文件仅保存在候审源目录，不进入发布包。

确认音色和演出后，才生成其余 31 个节点，并按听审结果决定是否替换运行时录音、更新 `v3-manifest.js`、移除 `narrationPending`、调整分包注册及资源哈希。
