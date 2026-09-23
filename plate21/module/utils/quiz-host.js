// quiz-host —— 单选答题页公共行为：attempt-ladder 判分 + 史料卡揭晓 + 后续旁白。
// 剧情配置由页面 data.content 提供（plate21/module/content/<页>.js）：
//   { puzzleId, correct, hints, reveal, clips: { followup } }
// 页面只需保留自己的 onLoad（进度恢复）与 onNext（带 checkpoint 的转场）。
// 首个使用方：pages/s2-quiz；dashuifa / s3-comic / waypoint 的同型答题可逐步迁入。
const session = require('../store/session')
const audioSrc = require('./audio-src')
const audioBus = require('./audio-bus')
const ladder = require('./attempt-ladder')

module.exports = Behavior({
  data: {
    selected: '',
    attempts: 0,
    hint: '',
    solved: false,
    revealed: false,
    showHistory: false,
    followup: false,
    advancing: false
  },

  methods: {
    onSelect(e) {
      if (this.data.solved) return
      this.setData({ selected: e.currentTarget.dataset.key })
    },

    onConfirm() {
      audioBus.stopKind('voice')
      const content = this.data.content
      if (this.data.solved || !this.data.selected) return
      const ok = this.data.selected === content.correct
      const result = ladder.submit({
        ok: ok,
        attempts: this.data.attempts,
        hints: content.hints,
        revealText: content.reveal
      })
      session.attemptPuzzle(content.puzzleId, result.attempts, ok, 'tap')
      if (result.solved) {
        if (result.revealed) session.viewHint(content.puzzleId, 3)
        this.setData({
          attempts: result.attempts,
          solved: true,
          revealed: result.revealed,
          hint: result.hint,
          selected: content.correct,
          showHistory: true
        })
        session.completePuzzle(content.puzzleId, {
          answer: content.correct,
          attempts: result.attempts,
          revealed: result.revealed
        }, { collectCard: true }).catch(function () {
          wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' })
        })
        return
      }
      session.viewHint(content.puzzleId, result.attempts)
      this.setData({ attempts: result.attempts, hint: result.hint })
    },

    onCloseHistory() {
      this.setData({
        showHistory: false,
        followup: true,
        narrSrc: audioSrc.clip(this.data.content.clips.followup)
      })
    }
  }
})
