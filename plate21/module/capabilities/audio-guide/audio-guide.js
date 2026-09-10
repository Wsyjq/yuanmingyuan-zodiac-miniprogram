const GUIDES = require('./scripts').GUIDES
const audio = require('../../services/audio')
const sessionStore=require('../../store/session')
Component({
  properties: { station: { type: String, value: '' } },
  data: {hasDeep:false,deepOpen:false,deepPlaying:false,guest:null, guide: null, open: false, hasAudio: false, playing: false, progress: 0, error: '' },
  observers: {
    station(id) {
      this.setGuide(id)
    }
  },
  lifetimes: {
    attached() {
      this.setGuide(this.data.station)
      this._unsubscribe = audio.get().subscribe((s) => {
        const active = s.trackId === 'guide-' + this.data.station
        this.setData({
          playing: active && s.playing,
          deepPlaying:s.trackId==='deep-'+this.data.station&&s.playing,
          progress: active && s.duration ? (s.position / s.duration) * 100 : 0,
          error: s.error
        })
      })
    },
    detached() {
      if (this._unsubscribe) this._unsubscribe()
    }
  },
  methods: {
    setGuide(id) {
      const guide = GUIDES[id] || null
      this.setData({ guide, hasAudio: !!(guide && guide.audio),hasDeep:!!(guide&&guide.deepScript&&guide.deepScript.length),deepOpen:false,guest:null })
    },
    onToggleDeep() {
      const next=!this.data.deepOpen;this.setData({deepOpen:next,guest:null})
      if(next){const key='deepOpened_'+this.data.station;const snap=sessionStore.getSnapshot();if(!snap||!snap.flags[key])sessionStore.setFlag(key,Date.now()).catch(()=>{})}
    },
    onToggleDeepPlay() {
      if(this.data.deepPlaying)audio.get().pause()
      else if(this.data.guide&&this.data.guide.deepAudio)audio.get().playVoice({id:'deep-'+this.data.station,title:this.data.guide.title+' · 深讲',src:this.data.guide.deepAudio})
    },
    onFab() {
      this.setData({ open: !this.data.open })
    },
    close() {
      this.setData({ open: false })
    },
    onTogglePlay() {
      if (this.data.playing) audio.get().pause()
      else {
        const tracks = Object.keys(GUIDES)
          .filter((k) => GUIDES[k].audio)
          .map((k) => ({ id: 'guide-' + k, title: GUIDES[k].title, src: GUIDES[k].audio }))
        audio.get().setQueue(
          tracks,
          tracks.findIndex((t) => t.id === 'guide-' + this.data.station)
        )
        audio
          .get()
          .playVoice({
            id: 'guide-' + this.data.station,
            title: this.data.guide.title,
            src: this.data.guide.audio
          })
      }
    },
    onSeek(e) {
      const s = audio.get().getState()
      audio.get().seek((s.duration * e.detail.value) / 100)
    },
    onRetry() {
      audio.get().retry()
    },
    pause() {
      audio.get().pause()
    }
  }
})
