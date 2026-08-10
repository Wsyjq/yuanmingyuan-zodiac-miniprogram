/**
 * task-banner —— 顶部任务指引条（黄铜描边横条，设计文档 §4.3）
 * 呈现【行动指引】：需要玩家去现实里做的事，一律用它固定呈现，不混进叙事段落。
 *
 * props:
 *   icon    String  左侧动作符号：支持图标名（hand/eye/camera/compare/lightbulb），
 *                   映射为内置 Lucide 图标 PNG；传其他文字时按原样显示（向后兼容）
 *   text    String  一句话指令
 *   visible Boolean 置 true 时从顶部滑下，false 向上收起
 */
const ICON_DIR = '/plate21/module/assets/img/icons'
// 图标名 → 内置 PNG（Lucide, ISC License，见 assets/NOTICE.md）
const ICON_MAP = {
  hand: `${ICON_DIR}/ic-hand-brass.png`,
  eye: `${ICON_DIR}/ic-eye-brass.png`,
  camera: `${ICON_DIR}/ic-camera-brass.png`,
  compare: `${ICON_DIR}/ic-arrow-left-right-brass.png`,
  lightbulb: `${ICON_DIR}/ic-lightbulb-brass.png`
}

Component({
  properties: {
    icon: {
      type: String,
      value: 'hand',
      observer(val) {
        this.setData({ iconSrc: ICON_MAP[val] || '' })
      }
    },
    text: { type: String, value: '' },
    visible: { type: Boolean, value: false }
  },

  data: {
    statusBarHeight: 0,
    iconSrc: ''   // icon 命中映射时为 PNG 路径，否则为空、按文字显示
  },

  lifetimes: {
    attached() {
      try {
        const info = wx.getWindowInfo()
        this.setData({ statusBarHeight: info.statusBarHeight || 0 })
      } catch (e) {
        this.setData({ statusBarHeight: 20 })
      }
    }
  }
})
