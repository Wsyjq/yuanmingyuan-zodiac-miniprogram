// gloss-text —— 正文行内术语段渲染：parts=[{t:'文字', g:'sl07'?}]，
// 带 g 的段渲染为铜绿虚线下划线（与 history-card 卡内 .hc-link 同视觉），
// 点击抛 glossary 事件（detail.key），由页面（gloss-host 行为）弹出对应史料卡。
// 字体字号继承所在段落（组件不设排版，只画术语样式）。
Component({
  properties: {
    parts: { type: Array, value: [] }
  },
  methods: {
    onSeg(e) {
      const g = e.currentTarget.dataset.g
      if (g) this.triggerEvent('glossary', { key: g })
    }
  }
})
