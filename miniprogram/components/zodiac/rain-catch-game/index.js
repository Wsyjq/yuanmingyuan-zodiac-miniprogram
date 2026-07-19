Component({
  properties: {
    game: {
      type: Object,
      value: {},
      observer() {
        this.syncVisualState();
      }
    },
    lanes: {
      type: Array,
      value: [0, 1, 2, 3, 4],
      observer() {
        this.syncVisualState();
      }
    }
  },
  data: {
    currentDrop: { lane: 2, type: 'good' },
    dropStyle: 'left: 50%; top: 16%; opacity: 0;',
    trayStyle: 'left: 50%;',
    progressPercent: 0,
    roundText: '尚未开始',
    statusText: '点击开始，观察天空中的落物',
    speedText: '速度 1.0x',
    running: false,
    activeDrop: false,
    dragging: false,
    localTrayLane: 2
  },
  lifetimes: {
    attached() {
      this.syncVisualState();
    },
    detached() {
      this.clearTimers();
    }
  },
  pageLifetimes: {
    hide() {
      this.stopGame('页面已暂停');
    }
  },
  methods: {
    getLanes() {
      return this.data.lanes && this.data.lanes.length ? this.data.lanes : [0, 1, 2, 3, 4];
    },
    lanePercent(lane) {
      const lanes = this.getLanes();
      const index = Math.max(0, lanes.indexOf(lane));
      return Math.round(((index + 0.5) / lanes.length) * 100);
    },
    syncVisualState() {
      const game = this.data.game || {};
      const lanes = this.getLanes();
      const trayLane = lanes.includes(game.trayLane) ? game.trayLane : lanes[Math.floor(lanes.length / 2)];
      const targetScore = Number(game.targetScore) || 300;
      const score = Math.max(0, Number(game.score) || 0);
      this.setData({
        localTrayLane: trayLane,
        trayStyle: `left: ${this.lanePercent(trayLane)}%;`,
        progressPercent: Math.min(100, Math.round((score / targetScore) * 100))
      });
      if (score >= targetScore && this.data.running) this.stopGame('承露完成');
    },
    clearTimers() {
      if (this._dropTimer) clearInterval(this._dropTimer);
      if (this._spawnTimer) clearTimeout(this._spawnTimer);
      this._dropTimer = null;
      this._spawnTimer = null;
      this._dropState = null;
    },
    startGame() {
      const game = this.data.game || {};
      if ((Number(game.score) || 0) >= (Number(game.targetScore) || 300)) return;
      this.clearTimers();
      this.setData({
        running: true,
        activeDrop: false,
        statusText: '云层正在变化，准备移动承露盘',
        roundText: `已完成 ${Number(game.round) || 0} 轮`
      });
      this.scheduleNextDrop(320);
    },
    stopGame(message = '已暂停，点击继续') {
      this.clearTimers();
      this.setData({
        running: false,
        activeDrop: false,
        dropStyle: 'left: 50%; top: 16%; opacity: 0;',
        statusText: message
      });
    },
    onStartToggle() {
      if (this.data.running) this.stopGame();
      else this.startGame();
    },
    scheduleNextDrop(delay) {
      if (!this.data.running) return;
      if (this._spawnTimer) clearTimeout(this._spawnTimer);
      this._spawnTimer = setTimeout(() => {
        this._spawnTimer = null;
        if (this.data.running) this.spawnDrop();
      }, delay);
    },
    spawnDrop() {
      const lanes = this.getLanes();
      const game = this.data.game || {};
      let laneIndex = Math.floor(Math.random() * lanes.length);
      if (lanes.length > 1 && lanes[laneIndex] === this._lastLane) laneIndex = (laneIndex + 1 + Math.floor(Math.random() * (lanes.length - 1))) % lanes.length;
      const lane = lanes[laneIndex];
      const type = Math.random() < (Number(game.badChance) || 0.28) ? 'bad' : 'good';
      const canShift = lanes.length > 1 && Math.random() < (Number(game.windShiftChance) || 0.38);
      const direction = Math.random() < 0.5 ? -1 : 1;
      const shiftedIndex = canShift ? Math.max(0, Math.min(lanes.length - 1, laneIndex + direction)) : laneIndex;
      const finalShiftedIndex = canShift && shiftedIndex === laneIndex ? Math.max(0, Math.min(lanes.length - 1, laneIndex - direction)) : shiftedIndex;
      const round = Number(game.round) || 0;
      const baseDuration = Number(game.baseFallDuration) || 1500;
      const minDuration = Number(game.minFallDuration) || 850;
      const duration = Math.max(minDuration, baseDuration - round * 55);
      const speed = Math.min(1.8, baseDuration / duration).toFixed(1);

      this._lastLane = lane;
      this._dropState = {
        lane,
        type,
        progress: 0,
        duration,
        shifted: false,
        shiftAt: 36 + Math.random() * 22,
        shiftLane: lanes[finalShiftedIndex]
      };
      this.setData({
        currentDrop: { lane, type },
        activeDrop: true,
        roundText: `第 ${round + 1} 次坠落`,
        statusText: type === 'bad' ? '碎石出现，避开它' : '雨露出现，接住它',
        speedText: `速度 ${speed}x`,
        dropStyle: `left: ${this.lanePercent(lane)}%; top: 16%; opacity: 1;`
      });

      this._dropTimer = setInterval(() => this.tickDrop(), 40);
    },
    tickDrop() {
      const drop = this._dropState;
      if (!drop || !this.data.running) return;
      drop.progress = Math.min(100, drop.progress + (40 / drop.duration) * 100);
      if (!drop.shifted && drop.shiftLane !== drop.lane && drop.progress >= drop.shiftAt) {
        drop.shifted = true;
        drop.lane = drop.shiftLane;
        this.setData({
          currentDrop: { lane: drop.lane, type: drop.type },
          statusText: '风向突变，落物正在横移'
        });
      }
      const top = 16 + drop.progress * 0.61;
      this.setData({
        dropStyle: `left: ${this.lanePercent(drop.lane)}%; top: ${top.toFixed(1)}%; opacity: 1;`
      });
      if (drop.progress >= 100) this.resolveDrop();
    },
    resolveDrop() {
      const drop = this._dropState;
      if (!drop) return;
      if (this._dropTimer) clearInterval(this._dropTimer);
      this._dropTimer = null;
      this._dropState = null;
      const hit = this.data.localTrayLane === drop.lane;
      this.setData({
        activeDrop: false,
        dropStyle: `left: ${this.lanePercent(drop.lane)}%; top: 77%; opacity: 0;`,
        statusText: hit ? '落物与托盘相遇' : '落物越过了承露盘'
      });
      this.triggerEvent('roundresult', {
        lane: drop.lane,
        type: drop.type,
        hit,
        shifted: drop.shifted
      });
      this.scheduleNextDrop(460);
    },
    getTouchX(event) {
      const touch = (event.touches && event.touches[0]) || (event.changedTouches && event.changedTouches[0]) || event.detail || {};
      if (touch.clientX !== undefined) return touch.clientX;
      return touch.x;
    },
    moveTrayToLane(lane) {
      if (lane === undefined || lane === null) return;
      this.setData({
        localTrayLane: lane,
        trayStyle: `left: ${this.lanePercent(lane)}%;`
      });
      this.triggerEvent('movetray', { lane });
    },
    moveTrayWithinRect(clientX, rect) {
      if (!rect || !rect.width) return;
      const lanes = this.getLanes();
      const ratio = Math.max(0, Math.min(0.9999, (clientX - rect.left) / rect.width));
      this.moveTrayToLane(lanes[Math.floor(ratio * lanes.length)]);
    },
    moveTrayToClientX(clientX) {
      if (clientX === undefined || clientX === null) return;
      if (this._trackRect) {
        this.moveTrayWithinRect(clientX, this._trackRect);
        return;
      }
      this.createSelectorQuery().select('.rain-track').boundingClientRect((rect) => {
        if (!rect || !rect.width) return;
        this._trackRect = rect;
        this.moveTrayWithinRect(clientX, rect);
      }).exec();
    },
    onTrackStart(event) {
      this.setData({ dragging: true });
      this.moveTrayToClientX(this.getTouchX(event));
    },
    onTrackTouch(event) {
      this.moveTrayToClientX(this.getTouchX(event));
    },
    onTrackEnd() {
      this._trackRect = null;
      this.setData({ dragging: false });
    }
  }
});
