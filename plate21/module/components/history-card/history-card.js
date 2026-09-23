/**
 * history-card —— 史料卡弹层（设计文档 §4.2，采风修订版扩展）
 * 呈现【史料〔来源〕】：档案著录卡样式，居中弹入（遮罩压暗其余画面）。
 *
 * props:
 *   visible       Boolean
 *   title         String        文物名 + 年代
 *   source        String        出处（底部"〔来源〕"小字）
 *   lines         Array<String|{parts:Array<{t:String,g?:String}>}>  正文各行；
 *                 带 parts 的行按段渲染，g 段为可点术语（铜绿虚线下划线）
 *   cornerNumber  Number        卡片右下角数字（采风修订版主线：数字连成日期密码）
 *   showCorner    Boolean       是否显示角落数字
 *   btnText       String        底部按钮文案（缺省"收入考察手册"）
 * 事件:
 *   bind:collect  点击"收入考察手册"（触发后组件自动关闭）
 *   bind:next     点击自定义按钮文案时触发（采风修订版：前往下一题）
 *   bind:close    点击右上关闭
 *   bind:glossary 点击术语段（detail.key 为术语键，由页面决定开哪张小卡）
 */
Component({
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '' },
    source: { type: String, value: '' },
    lines: { type: Array, value: [] },
    cornerNumber: { type: Number, value: 0 },
    showCorner: { type: Boolean, value: false },
    btnText: { type: String, value: '' }
  },

  data: {
    closing: false   // INT-301：离场动画中间态，期间忽略二次操作
  },

  observers: {
    visible(value) {
      if (value && this.data.closing) this.setData({ closing: false })
    }
  },

  lifetimes: {
    detached() {
      if (this._closeTimer) clearTimeout(this._closeTimer)
    }
  },

  methods: {
    // INT-301：关闭走离场动画——先 closing 态播放 0.25s 淡出，再 triggerEvent 让页面卸载
    onClose() {
      if (this.data.closing) return
      this.setData({ closing: true })
      this._closeTimer = setTimeout(() => {
        this._closeTimer = null
        this.setData({ closing: false })
        this.triggerEvent('close')
      }, 250)
    },

    onCollect() {
      if (this.data.closing) return
      this.triggerEvent('collect')
      this.onClose()
    },

    // 采风修订版：自定义按钮文案时走 next 事件
    // 触发 next 后不再自动 onClose——页面收到 next 会自行 redirectTo 卸载本组件；
    // 若页面选择不跳转（如仅展示），应由页面自行 setData visible=false 关闭弹层。
    // 这样避免组件的 close 事件和页面的跳转 setData 竞争，导致跳转被打断。
    onBtn() {
      if (this.data.closing) return
      if (this.data.btnText) {
        this.setData({ closing: true })
        this.triggerEvent('next')
      } else {
        this.triggerEvent('collect')
        this.onClose()
      }
    },

    noop() {},

    // 正文里的术语（铜绿虚线下划线）点按：抛给页面开对应术语史料卡
    onSeg(e) {
      const g = e.currentTarget.dataset.g
      if (g) this.triggerEvent('glossary', { key: g })
    }
  }
})
