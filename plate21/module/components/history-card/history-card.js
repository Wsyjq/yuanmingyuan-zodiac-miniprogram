/**
 * history-card —— 史料卡弹层（设计文档 §4.2，采风修订版扩展）
 * 呈现【史料〔来源〕】：档案著录卡样式，底部滑入。
 *
 * props:
 *   visible       Boolean
 *   title         String        文物名 + 年代
 *   source        String        出处（底部"〔来源〕"小字）
 *   lines         Array<String> 正文各行
 *   cornerNumber  Number        卡片右下角数字（采风修订版主线：数字连成日期密码）
 *   showCorner    Boolean       是否显示角落数字
 *   btnText       String        底部按钮文案（缺省"收入考察手册"）
 * 事件:
 *   bind:collect  点击"收入考察手册"（触发后组件自动关闭）
 *   bind:next     点击自定义按钮文案时触发（采风修订版：前往下一题）
 *   bind:close    点击右上关闭
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
    // INT-301：关闭走离场动画——先 closing 态播放 0.25s 滑出，再 triggerEvent 让页面卸载
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

    noop() {}
  }
})
