/**
 * dialogue-block —— V2.2 人物台词块（讲述版「人声」声部的页面载体）。
 *
 * 四声部分工（docs/剧情可用稿-人物对话版-V2.2.md §一）：旁白负责叙事，
 * 人声=页里的人成段说话。本组件只承载「一句话一轮」的成段台词：
 *   speaker  人物名（名牌）
 *   aside    声道/方位标注（如「左声道」「画里，远远地」），可空
 *   text     成段台词本体（三句往上，一轮说完整）
 *   clipId   对应 TTS 音频 id（audio-src 拼 URL），可空＝纯文稿
 *   note     脚注（蒋友仁/乾隆页挂「历史人物 · 台词为艺术演绎」），可空
 * 红线：人不出题、不调度游客、不知身后事——内容由文案层保证。
 */
const audioSrc = require('../../utils/audio-src')

Component({
  properties: {
    speaker: { type: String, value: '' },
    aside: { type: String, value: '' },
    text: { type: String, value: '' },
    clipId: { type: String, value: '' },
    note: { type: String, value: '' }
  },

  data: {
    clipSrc: ''
  },

  lifetimes: {
    attached() {
      if (this.data.clipId) {
        this.setData({ clipSrc: audioSrc.clip(this.data.clipId) })
      }
    }
  }
})
