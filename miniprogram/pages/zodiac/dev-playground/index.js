const tourService = require('../../../services/tour-service');
const { nowIso } = require('../../../utils/time');
const {
  dashuifaStartOrder,
  defaultPuzzleFragments,
  hydratePuzzleGame,
  isPuzzleSolved,
  slidePuzzleTile,
  createEnvelopeGame,
  placeEnvelopePiece,
  removeEnvelopePiece,
  isEnvelopeSolved,
  hydrateMazeGame,
  pickTimelineEvent,
  removeTimelineEvent,
  isTimelineSolved
} = require('../../../utils/gameplay-helpers');

const routeId = 'zodiac-return';
const zodiacOrder = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const zodiacClock = {
  鼠: { branch: '子', time: '23-01' }, 牛: { branch: '丑', time: '01-03' }, 虎: { branch: '寅', time: '03-05' },
  兔: { branch: '卯', time: '05-07' }, 龙: { branch: '辰', time: '07-09' }, 蛇: { branch: '巳', time: '09-11' },
  马: { branch: '午', time: '11-13' }, 羊: { branch: '未', time: '13-15' }, 猴: { branch: '申', time: '15-17' },
  鸡: { branch: '酉', time: '17-19' }, 狗: { branch: '戌', time: '19-21' }, 猪: { branch: '亥', time: '21-23' }
};
function buildPasswordFound(clues) {
  return clues.reduce((found, clue) => {
    found[clue.id] = false;
    return found;
  }, {});
}

function countOverlayAlignment(rotation, targetRotation) {
  const delta = ((Number(targetRotation) || 0) - (Number(rotation) || 0) + 360) % 360;
  if (delta === 0) return 3;
  if (delta === 90) return 2;
  if (delta === 180) return 1;
  return 0;
}

function hydratePasswordClues(clues, found) {
  return clues.map((clue) => {
    const rotation = Number(clue.rotation) || 0;
    return {
      ...clue,
      found: Boolean(found && found[clue.id]),
      rotation,
      alignmentCount: clue.type === 'rotate' ? countOverlayAlignment(rotation, clue.targetRotation) : 0,
      options: (clue.options || []).map((option, index) => ({
        ...option,
        index,
        selected: Boolean(option.selected)
      }))
    };
  });
}

Page({
  data: {
    route: null,
    stages: [],
    selectedStageId: '',
    stage: null,
    gameType: '',
    game: {},
    markChips: [],
    progressText: '调试',
    progressPercent: 0,
    pickedText: '',
    lanes: [0, 1, 2, 3, 4],
    resultText: '尚未输出 StageResult',
    eventText: '暂无组件事件',
    eventLog: []
  },

  onLoad(options) {
    const app = getApp();
    if (!app.globalData.enableDevPlayground) {
      wx.redirectTo({ url: '/pages/zodiac/index/index' });
      return;
    }
    const route = tourService.getBootstrap(routeId).route;
    const stages = route.stages.map((stage) => ({
      stageId: stage.stageId,
      order: stage.order,
      title: stage.title,
      place: stage.place,
      gameType: stage.gameType
    }));
    this.setData({ route, stages });
    this.loadStage(options.stageId || route.stages[0].stageId);
  },

  loadStage(stageId) {
    const route = this.data.route || tourService.getBootstrap(routeId).route;
    const stage = tourService.getStage(routeId, stageId) || route.stages[0];
    const progressPercent = Math.round((stage.order / route.stages.length) * 100);
    const game = this.createGame(stage, route);
    this.setData({
      route,
      selectedStageId: stage.stageId,
      stage,
      gameType: stage.gameType,
      game,
      pickedText: game.picked ? game.picked.join(' → ') : '',
      progressText: `${stage.order}/${route.stages.length}`,
      progressPercent,
      markChips: this.createMarkChips(route, stage),
      resultText: '尚未输出 StageResult',
      eventText: '暂无组件事件',
      eventLog: []
    });
  },

  selectStage(event) {
    const stageId = event.currentTarget.dataset.stageId;
    if (stageId && stageId !== this.data.selectedStageId) this.loadStage(stageId);
  },

  createMarkChips(route, stage) {
    const collected = new Set(stage.gameType === 'final'
      ? [...route.finalRule.returned, ...route.finalRule.tracking]
      : [stage.mark.zodiac]);
    const tracking = new Set(route.finalRule.tracking);
    const missing = new Set(route.finalRule.missing);
    return zodiacOrder.map((zodiac) => ({
      zodiac,
      collected: collected.has(zodiac),
      tracking: tracking.has(zodiac),
      missing: missing.has(zodiac),
      label: collected.has(zodiac) ? (tracking.has(zodiac) ? '追索' : '调试') : missing.has(zodiac) ? '空缺' : '待寻'
    }));
  },

  createGame(stage, route) {
    const type = stage.gameType;
    if (type === 'dashuifa') return hydratePuzzleGame({
      order: (stage.gameConfig.initial || dashuifaStartOrder).slice(),
      target: stage.gameConfig.target,
      fragments: stage.gameConfig.fragments || defaultPuzzleFragments,
      blueprintRows: stage.gameConfig.blueprintRows || [],
      moveCount: 0,
      invalidMoves: 0
    });
    if (type === 'rain') return {
      caught: 0,
      score: 0,
      round: 0,
      trayLane: 2,
      combo: 0,
      bestCombo: 0,
      escapedBad: 0,
      misses: 0,
      lastOutcome: '尚未开始承露',
      targetScore: stage.gameConfig.targetScore || 300,
      basePoints: stage.gameConfig.basePoints || 50,
      badChance: stage.gameConfig.badChance,
      windShiftChance: stage.gameConfig.windShiftChance,
      baseFallDuration: stage.gameConfig.baseFallDuration,
      minFallDuration: stage.gameConfig.minFallDuration
    };
    if (type === 'envelope') return createEnvelopeGame(stage.gameConfig);
    if (type === 'clock') return {
      selectedHeadIndex: null,
      heads: (stage.gameConfig.heads || ['鼠', '牛', '虎', '兔'].map((label) => ({ label }))).map((item) => ({ ...item, locked: false })),
      branches: (stage.gameConfig.branches || ['寅', '子', '卯', '丑'].map((label) => ({ label }))).map((item) => ({ ...item, locked: false })),
      answer: stage.gameConfig.answer,
      lockedCount: 0,
      message: '先选一个兽首，再选对应时辰。'
    };
    if (type === 'password') {
      const clues = stage.gameConfig.clues || [];
      const found = buildPasswordFound(clues);
      return { clues: hydratePasswordClues(clues, found), found, foundCount: 0, activeClue: clues[0] ? clues[0].id : '', password: stage.gameConfig.password, attempts: 0, message: '依次解开三处证据，密码盘会自动记录结果。' };
    }
    if (type === 'order') return { picked: [], cards: stage.gameConfig.cards.map((label) => ({ label, used: false })), answer: stage.gameConfig.answer, branches: stage.gameConfig.branches || [], hint: stage.gameConfig.hint, attempts: 0, message: '按地支时辰位安放兽首。' };
    if (type === 'maze') return hydrateMazeGame({
      rotations: (stage.gameConfig.initial || []).slice(),
      target: stage.gameConfig.target,
      modules: stage.gameConfig.modules || [],
      timelineEvents: stage.gameConfig.timelineEvents || [],
      timelineAnswer: stage.gameConfig.timelineAnswer || [],
      timelinePicked: [],
      phase: 'maze',
      mazeSolved: false,
      walking: false,
      attempts: 0,
      timelineAttempts: 0,
      message: '从西侧入口开始，旋转道路接到中心亭。'
    });
    return this.createFinalGame(route);
  },

  createFinalGame(route) {
    const finalRule = route.finalRule;
    const returned = new Set(finalRule.returned || []);
    const tracking = new Set(finalRule.tracking || []);
    const missing = new Set(finalRule.missing || []);
    const expected = new Set([...(finalRule.returned || []), ...(finalRule.tracking || [])]);
    const availableMarks = zodiacOrder
      .filter((zodiac) => expected.has(zodiac))
      .map((zodiac) => ({
        zodiac,
        status: tracking.has(zodiac) ? 'tracking' : 'returned',
        placed: false
      }));
    return {
      confirmedHorse: false,
      selectedMark: '',
      availableMarks,
      slots: zodiacOrder.map((zodiac) => ({
        zodiac,
        branch: zodiacClock[zodiac].branch,
        time: zodiacClock[zodiac].time,
        status: tracking.has(zodiac) ? 'tracking' : missing.has(zodiac) ? 'missing' : returned.has(zodiac) ? 'returned' : 'empty',
        placedMark: '',
        markStatus: ''
      })),
      placedCount: 0,
      requiredCount: expected.size,
      missingRequiredCount: 0,
      progressPercent: 0,
      solved: false,
      attempts: 0,
      message: '选择生肖印记，再根据十二时辰放入对应地支格。'
    };
  },

  resetGame() {
    const component = this.selectComponent && this.selectComponent('#active-game');
    if (component && typeof component.stopGame === 'function') component.stopGame('组件状态已重置');
    const game = this.createGame(this.data.stage, this.data.route);
    this.setData({ game, pickedText: game.picked ? game.picked.join(' → ') : '' });
    this.recordEvent('reset', { stageId: this.data.stage.stageId });
  },

  simulateComplete() {
    this.completeCurrentStage('simulate-complete');
  },

  simulateSkip() {
    this.recordResult('skipped', 'simulate-skip');
  },

  completeCurrentStage(action = 'component-complete') {
    this.recordResult('completed', action);
  },

  recordResult(status, action, detail = {}) {
    const stage = this.data.stage;
    const result = {
      routeId,
      stageId: stage.stageId,
      stageOrder: stage.order,
      gameType: stage.gameType,
      status,
      action,
      mark: stage.mark ? stage.mark.zodiac : null,
      completedAt: nowIso(),
      detail
    };
    this.setData({ resultText: JSON.stringify(result, null, 2) });
    this.recordEvent('StageResult', result);
  },

  recordEvent(type, detail = {}) {
    const item = { at: nowIso(), type, detail };
    const eventLog = [item, ...this.data.eventLog].slice(0, 8);
    const eventText = eventLog.map((eventItem) => `${eventItem.at.slice(11, 19)} ${eventItem.type} ${JSON.stringify(eventItem.detail)}`).join('\n');
    this.setData({ eventLog, eventText });
  },

  selectDashuifaTile(event) {
    const index = Number(event.detail && event.detail.index !== undefined ? event.detail.index : event.currentTarget.dataset.index);
    const result = slidePuzzleTile(this.data.game, index);
    this.setData({ game: result.game });
    this.recordEvent(result.moved ? 'dashuifa:slide' : 'dashuifa:blocked', { index, blankIndex: result.game.blankIndex });
    if (result.moved && isPuzzleSolved(result.game)) this.completeCurrentStage('dashuifa-solved');
  },

  checkDashuifa() {
    const solved = isPuzzleSolved(this.data.game);
    if (solved) this.completeCurrentStage('check-dashuifa');
    else wx.showToast({ title: '还没有复原', icon: 'none' });
  },

  moveTray(event) {
    const lane = Number(event.detail && event.detail.lane !== undefined ? event.detail.lane : event.currentTarget.dataset.lane);
    this.setData({ 'game.trayLane': lane });
    this.recordEvent('rain:movetray', { lane });
  },

  resolveRain(event) {
    const detail = event.detail || event;
    const game = { ...this.data.game };
    const type = detail.type;
    const hit = Boolean(detail.hit);
    game.round += 1;
    let outcome = 'miss';
    if (type === 'good' && hit) {
      game.caught += 1;
      game.combo += 1;
      game.bestCombo = Math.max(game.bestCombo, game.combo);
      const gained = game.basePoints + Math.max(0, game.combo - 1) * 10;
      game.score += gained;
      outcome = 'caught-good';
      if (game.score >= game.targetScore) {
        game.lastOutcome = '金色雨露入盘，承露完成';
        this.setData({ game });
        this.recordEvent('rain:resolve', { ...detail, trayLane: game.trayLane, outcome });
        this.completeCurrentStage('rain-target-reached');
        return;
      }
      game.lastOutcome = `接住雨露，获得 ${gained} 分`;
    } else if (type === 'bad' && hit) {
      game.combo = 0;
      game.misses += 1;
      game.lastOutcome = '碎石落入承露盘，连击中断';
      outcome = 'caught-bad';
    } else if (type === 'good') {
      game.combo = 0;
      game.misses += 1;
      game.lastOutcome = '雨露擦肩而过，重新观察落点';
      outcome = 'missed-good';
    } else {
      game.escapedBad += 1;
      game.lastOutcome = '避开碎石，托盘保持完整';
      outcome = 'avoided-bad';
    }
    this.setData({ game });
    this.recordEvent('rain:resolve', { ...detail, trayLane: game.trayLane, outcome });
  },

  pickEnvelopePiece(event) {
    const index = Number(event.detail && event.detail.index !== undefined ? event.detail.index : event.currentTarget.dataset.index);
    const game = placeEnvelopePiece(this.data.game, index);
    this.setData({ game });
    this.recordEvent('envelope:pickpiece', { index, pieceId: game.pieces[index] && game.pieces[index].id });
  },

  clearEnvelope() {
    this.resetGame();
  },

  removeEnvelopePiece(event) {
    const index = Number(event.detail && event.detail.index !== undefined ? event.detail.index : event.currentTarget.dataset.index);
    const removedId = this.data.game.slots[index] && this.data.game.slots[index].pieceId;
    const game = removeEnvelopePiece(this.data.game, index);
    this.setData({ game });
    this.recordEvent('envelope:removepiece', { index, pieceId: removedId });
  },

  checkEnvelope() {
    const game = { ...this.data.game, attempts: (this.data.game.attempts || 0) + 1 };
    if (isEnvelopeSolved(game)) {
      this.setData({ game: { ...game, message: '信封已拼出下一站。' } });
      this.completeCurrentStage('check-envelope');
    } else {
      this.setData({ game: { ...game, message: '文字顺序不对，试着对照水渍痕迹。' } });
      wx.showToast({ title: '信封文字还不对', icon: 'none' });
    }
  },

  selectClockHead(event) {
    const index = Number(event.detail && event.detail.index !== undefined ? event.detail.index : event.currentTarget.dataset.index);
    if (this.data.game.heads[index].locked) return;
    this.setData({ 'game.selectedHeadIndex': index });
    this.recordEvent('clock:selecthead', { index, label: this.data.game.heads[index].label });
  },

  selectClockBranch(event) {
    const index = Number(event.detail && event.detail.index !== undefined ? event.detail.index : event.currentTarget.dataset.index);
    const game = {
      ...this.data.game,
      heads: this.data.game.heads.map((head) => ({ ...head })),
      branches: this.data.game.branches.map((branch) => ({ ...branch }))
    };
    const headIndex = game.selectedHeadIndex;
    if (headIndex === null || headIndex === undefined) {
      wx.showToast({ title: '先选择兽首', icon: 'none' });
      return;
    }
    if (game.branches[index].locked) return;
    const head = game.heads[headIndex].label;
    const branch = game.branches[index].label;
    if (game.answer[head] !== branch) {
      game.message = `${head}首不是${branch}时。`;
      this.setData({ game });
      this.recordEvent('clock:mismatch', { head, branch });
      wx.showToast({ title: '时辰不匹配', icon: 'none' });
      return;
    }
    game.heads[headIndex].locked = true;
    game.branches[index].locked = true;
    game.selectedHeadIndex = null;
    game.lockedCount += 1;
    game.message = `${head}${branch}时匹配成功`;
    this.setData({ game });
    this.recordEvent('clock:match', { head, branch });
    if (game.lockedCount >= game.heads.length) this.completeCurrentStage('clock-all-matched');
  },

  selectPasswordEvidence(event) {
    const clue = event.detail && event.detail.clue ? event.detail.clue : event.currentTarget.dataset.clue;
    if (!this.data.game.clues.some((item) => item.id === clue)) return;
    this.setData({ 'game.activeClue': clue });
    this.recordEvent('password:selectevidence', { clue });
  },

  togglePasswordEvidence(event) {
    const detail = event.detail || event.currentTarget.dataset;
    const clueId = detail.clue;
    const optionIndex = Number(detail.index);
    const game = {
      ...this.data.game,
      found: { ...this.data.game.found },
      clues: this.data.game.clues.map((clue) => ({
        ...clue,
        options: (clue.options || []).map((option) => ({ ...option }))
      }))
    };
    const clue = game.clues.find((item) => item.id === clueId);
    const option = clue && clue.options[optionIndex];
    if (!clue || !option || clue.found) return;
    option.selected = !option.selected;
    const targets = clue.options.filter((item) => item.target);
    const selectedTargets = targets.filter((item) => item.selected).length;
    const selectedWrong = clue.options.some((item) => item.selected && !item.target);
    if (selectedTargets === targets.length && !selectedWrong) {
      clue.found = true;
      game.found[clue.id] = true;
      game.message = `${clue.title}解码完成，第 ${game.clues.indexOf(clue) + 1} 位是 ${clue.digit}。`;
    } else if (selectedWrong) {
      game.message = '标记中混入了裂损或不同纹样，点按取消后再观察。';
    } else {
      game.message = `已标记 ${selectedTargets}/${targets.length} 处有效证据。`;
    }
    game.foundCount = Object.keys(game.found).filter((key) => game.found[key]).length;
    this.setData({ game });
    this.recordEvent('password:toggleevidence', { clue: clueId, index: optionIndex, selected: option.selected });
  },

  rotatePasswordOverlay() {
    const game = {
      ...this.data.game,
      found: { ...this.data.game.found },
      clues: this.data.game.clues.map((clue) => ({ ...clue }))
    };
    const clue = game.clues.find((item) => item.id === 'overlay');
    if (!clue || clue.found) return;
    clue.rotation = (Number(clue.rotation) + 90) % 360;
    clue.alignmentCount = countOverlayAlignment(clue.rotation, clue.targetRotation);
    if (clue.rotation === clue.targetRotation) {
      clue.found = true;
      game.found[clue.id] = true;
      game.message = `断线完全重合，第 3 位是 ${clue.digit}。`;
    } else {
      game.message = `硫酸纸已旋转到 ${clue.rotation}°，定位点重合 ${clue.alignmentCount}/3。`;
    }
    game.foundCount = Object.keys(game.found).filter((key) => game.found[key]).length;
    this.setData({ game });
    this.recordEvent('password:rotateoverlay', { rotation: clue.rotation, solved: clue.found });
  },

  checkPassword() {
    const game = { ...this.data.game, attempts: (this.data.game.attempts || 0) + 1 };
    const decoded = game.clues.map((clue) => (clue.found ? clue.digit : '')).join('');
    if (game.foundCount < game.clues.length) {
      this.setData({ game: { ...game, message: `还有 ${game.clues.length - game.foundCount} 处证据没有解开。` } });
      wx.showToast({ title: '证据尚未集齐', icon: 'none' });
    } else if (decoded === game.password) {
      this.setData({ game: { ...game, message: '暗码正确，下一枚印记出现。' } });
      this.completeCurrentStage('check-password');
    } else {
      this.setData({ game: { ...game, message: '暗码不对，重新核对三处证据。' } });
      wx.showToast({ title: '密码不对', icon: 'none' });
    }
  },

  pickOrderCard(event) {
    const index = Number(event.detail && event.detail.index !== undefined ? event.detail.index : event.currentTarget.dataset.index);
    const game = { ...this.data.game, picked: this.data.game.picked.slice(), cards: this.data.game.cards.map((card) => ({ ...card })) };
    if (game.cards[index].used) return;
    game.cards[index].used = true;
    game.picked.push(game.cards[index].label);
    game.message = `沙盘已放入 ${game.picked.length}/${game.answer.length}`;
    this.setData({ game, pickedText: game.picked.join(' → ') });
    this.recordEvent('order:pickcard', { index, label: game.cards[index].label });
  },

  removeOrderCard(event) {
    const index = Number(event.detail && event.detail.index !== undefined ? event.detail.index : event.currentTarget.dataset.index);
    const game = { ...this.data.game, picked: this.data.game.picked.slice(), cards: this.data.game.cards.map((card) => ({ ...card })) };
    const removed = game.picked.splice(index, 1)[0];
    if (!removed) return;
    const card = game.cards.find((item) => item.label === removed && item.used);
    if (card) card.used = false;
    game.message = game.picked.length ? `已安放 ${game.picked.length}/${game.answer.length} 尊兽首` : '按地支时辰位安放兽首。';
    this.setData({ game, pickedText: game.picked.join(' → ') });
    this.recordEvent('order:removecard', { index, label: removed });
  },

  clearOrder() {
    this.resetGame();
  },

  checkOrder() {
    const game = { ...this.data.game, attempts: (this.data.game.attempts || 0) + 1 };
    if (game.picked.join('') === game.answer.join('')) {
      this.setData({ game: { ...game, message: '地支顺序已复原。' } });
      this.completeCurrentStage('check-order');
    } else {
      this.setData({ game: { ...game, message: '顺序仍有偏差，回到子鼠重新排。' } });
      wx.showToast({ title: '排序还不对', icon: 'none' });
    }
  },

  rotateMaze(event) {
    const index = Number(event.detail && event.detail.index !== undefined ? event.detail.index : event.currentTarget.dataset.index);
    const game = { ...this.data.game, rotations: this.data.game.rotations.slice() };
    game.rotations[index] = (game.rotations[index] + 90) % 360;
    this.setData({ game: hydrateMazeGame({ ...game, message: '道路模块已旋转，检查是否连通。' }) });
    this.recordEvent('maze:rotate', { index, rotation: game.rotations[index] });
  },

  checkMaze() {
    const game = hydrateMazeGame({ ...this.data.game, attempts: (this.data.game.attempts || 0) + 1 });
    const solved = game.modules.length === game.target.length && game.modules.every((module) => module.aligned);
    if (!solved) {
      this.setData({ game: { ...game, message: `已连通 ${game.connectedCount}/${game.target.length} 段，再调整方向。` } });
      wx.showToast({ title: '道路还没连通', icon: 'none' });
      return;
    }
    this.setData({
      game: hydrateMazeGame({
        ...game,
        walking: true,
        mazeSolved: true,
        phase: 'timeline',
        message: '小人已到达中心亭，按年份排好兽首回归记录。'
      })
    });
    this.recordEvent('maze:solved');
  },

  pickMazeTimeline(event) {
    const index = Number(event.detail && event.detail.index !== undefined ? event.detail.index : event.currentTarget.dataset.index);
    const game = pickTimelineEvent(this.data.game, index);
    this.setData({ game });
    this.recordEvent('maze:picktimeline', { index, eventId: game.timelineEvents[index] && game.timelineEvents[index].id });
  },

  removeMazeTimeline(event) {
    const index = Number(event.detail && event.detail.index !== undefined ? event.detail.index : event.currentTarget.dataset.index);
    const eventId = this.data.game.timelinePicked[index];
    this.setData({ game: removeTimelineEvent(this.data.game, index) });
    this.recordEvent('maze:removetimeline', { index, eventId });
  },

  clearMazeTimeline() {
    this.setData({ game: hydrateMazeGame({ ...this.data.game, timelinePicked: [], message: '时间线已清空，从最早回归的兽首开始。' }) });
    this.recordEvent('maze:cleartimeline');
  },

  checkMazeTimeline() {
    const game = hydrateMazeGame({ ...this.data.game, timelineAttempts: (this.data.game.timelineAttempts || 0) + 1 });
    if (!isTimelineSolved(game)) {
      this.setData({ game: { ...game, message: '年份顺序仍有偏差，先找最早回归的记录。' } });
      this.recordEvent('maze:timeline-mismatch', { picked: game.timelinePicked });
      wx.showToast({ title: '时间线顺序不对', icon: 'none' });
      return;
    }
    this.setData({ game: { ...game, message: '道路与回归时间线都已完成。' } });
    this.recordEvent('maze:timeline-solved');
    this.completeCurrentStage('check-maze-timeline');
  },

  confirmHorse() {
    if (this.data.game.confirmedHorse) return;
    this.setData({ 'game.confirmedHorse': true });
    this.recordEvent('final:confirmhorse');
  },

  selectFinalMark(event) {
    const zodiac = event.detail && event.detail.zodiac ? event.detail.zodiac : event.currentTarget.dataset.zodiac;
    const mark = (this.data.game.availableMarks || []).find((item) => item.zodiac === zodiac);
    if (!mark || mark.placed) return;
    this.setData({ 'game.selectedMark': zodiac, 'game.message': `已选${zodiac}首：请判断它对应的地支时辰。` });
    this.recordEvent('final:selectmark', { zodiac });
  },

  placeFinalSlot(event) {
    const slotZodiac = event.detail && event.detail.zodiac ? event.detail.zodiac : event.currentTarget.dataset.zodiac;
    const game = this.data.game;
    if (!game.confirmedHorse) {
      wx.showToast({ title: '先确认马首归位', icon: 'none' });
      return;
    }
    if (!game.selectedMark) {
      wx.showToast({ title: '先选择一枚印记', icon: 'none' });
      return;
    }
    if (game.selectedMark !== slotZodiac) {
      this.setData({
        'game.attempts': (game.attempts || 0) + 1,
        'game.message': `${game.selectedMark}首不属于这个时辰格，再回想地支顺序。`
      });
      wx.showToast({ title: '时辰对应不正确', icon: 'none' });
      return;
    }

    const availableMarks = game.availableMarks.map((mark) => ({ ...mark }));
    const slots = game.slots.map((slot) => ({ ...slot }));
    const mark = availableMarks.find((item) => item.zodiac === game.selectedMark);
    const slot = slots.find((item) => item.zodiac === slotZodiac);
    if (!mark || mark.placed || !slot || slot.placedMark) return;

    mark.placed = true;
    slot.placedMark = mark.zodiac;
    slot.markStatus = mark.status;
    const placedCount = availableMarks.filter((item) => item.placed).length;
    const requiredCount = game.requiredCount || availableMarks.length;
    const solved = placedCount >= requiredCount;
    this.setData({
      game: {
        ...game,
        selectedMark: '',
        availableMarks,
        slots,
        placedCount,
        requiredCount,
        progressPercent: Math.round((placedCount / Math.max(requiredCount, 1)) * 100),
        solved,
        attempts: game.attempts || 0,
        message: solved ? '八枚印记全部归位，归途拼图完成。' : `${mark.zodiac}首已归入${slot.branch}时。`
      }
    });
    this.recordEvent('final:placeslot', { zodiac: slotZodiac, solved });
  },

  completeFinalStage() {
    const game = this.data.game;
    if (!game.confirmedHorse) {
      wx.showToast({ title: '先确认马首归位', icon: 'none' });
      return;
    }
    if (!game.solved) {
      wx.showToast({ title: `还需归位 ${Math.max((game.requiredCount || 8) - (game.placedCount || 0), 0)} 枚`, icon: 'none' });
      return;
    }
    this.completeCurrentStage('complete-final-board');
  }
});
