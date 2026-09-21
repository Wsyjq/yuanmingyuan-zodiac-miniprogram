// gloss-host —— 页面接术语史料卡弹层的公共行为。
// 配套：utils/sl-cards（卡内容注册表）、components/gloss-text（正文行内术语）、
//       components/history-card（弹层；卡内 parts 段的 g 键也走同一 onGlossary）。
// 用法：behaviors: [glossHost]；wxml 里放一张术语弹层：
//   <history-card wx:if="{{gloss}}" visible="{{!!gloss}}" title="{{gloss.title}}"
//     source="{{gloss.source}}" lines="{{gloss.lines}}" btn-text="返 回"
//     bind:next="onGlossClose" bind:close="onGlossClose" />
const slCards = require('./sl-cards')

module.exports = Behavior({
  data: {
    gloss: null
  },
  methods: {
    onGlossary(e) {
      const key = e.detail && e.detail.key
      const g = key && slCards.get(key)
      if (g) this.setData({ gloss: g })
    },
    onGlossClose() {
      this.setData({ gloss: null })
    }
  }
})
