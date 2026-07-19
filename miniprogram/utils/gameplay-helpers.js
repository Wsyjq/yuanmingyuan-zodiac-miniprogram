const dashuifaStartOrder = [0, 2, 4, 1, 6, 3, 7, 5, 8];
const defaultPuzzleTarget = [1, 2, 3, 4, 5, 6, 7, 8, 0];
const defaultPuzzleFragments = ['远景', '残柱', '水法', '台阶', '水钟', '铜像', '石纹', '暗渠'].map((title, index) => ({
  title,
  detail: `残片 ${index + 1}`,
  motif: String(index + 1)
}));

function areGridNeighbors(first, second, columns = 3) {
  const rowDelta = Math.abs(Math.floor(first / columns) - Math.floor(second / columns));
  const columnDelta = Math.abs((first % columns) - (second % columns));
  return rowDelta + columnDelta === 1;
}

function buildPuzzleTiles(order, fragments, target) {
  const blankIndex = order.indexOf(0);
  return order.map((value, slotIndex) => {
    if (value === 0) {
      return {
        value,
        slotIndex,
        blank: true,
        movable: false,
        correct: target[slotIndex] === 0
      };
    }
    return {
      ...((fragments && fragments[value - 1]) || defaultPuzzleFragments[value - 1]),
      value,
      slotIndex,
      blank: false,
      movable: areGridNeighbors(slotIndex, blankIndex),
      correct: value === target[slotIndex]
    };
  });
}

function countPuzzleSeams(order) {
  let seams = 0;
  for (let index = 0; index < order.length; index += 1) {
    const value = order[index];
    if (!value) continue;
    const column = index % 3;
    if (column < 2 && order[index + 1] && order[index + 1] === value + 1) seams += 1;
    if (index < 6 && order[index + 3] && order[index + 3] === value + 3) seams += 1;
  }
  return seams;
}

function isPuzzleSolved(gameOrOrder, explicitTarget) {
  const order = Array.isArray(gameOrOrder) ? gameOrOrder : gameOrOrder.order;
  const target = explicitTarget || (Array.isArray(gameOrOrder) ? defaultPuzzleTarget : gameOrOrder.target) || defaultPuzzleTarget;
  return order.every((value, index) => value === target[index]);
}

function hydratePuzzleGame(game) {
  const order = (game.order || dashuifaStartOrder).slice();
  const target = (game.target || defaultPuzzleTarget).slice();
  const fragments = game.fragments || defaultPuzzleFragments;
  return {
    ...game,
    order,
    target,
    fragments,
    blankIndex: order.indexOf(0),
    tiles: buildPuzzleTiles(order, fragments, target),
    correctCount: order.filter((value, index) => value !== 0 && value === target[index]).length,
    seamCount: countPuzzleSeams(order),
    moveCount: Number(game.moveCount) || 0,
    invalidMoves: Number(game.invalidMoves) || 0,
    message: game.message || '点击空位上下左右相邻的残片。'
  };
}

function slidePuzzleTile(game, index) {
  const order = game.order.slice();
  const blankIndex = order.indexOf(0);
  if (order[index] === 0 || !areGridNeighbors(index, blankIndex)) {
    return {
      moved: false,
      game: hydratePuzzleGame({
        ...game,
        invalidMoves: (Number(game.invalidMoves) || 0) + 1,
        message: '这块残片碰不到空位，只能沿相邻方向滑动。'
      })
    };
  }
  order[blankIndex] = order[index];
  order[index] = 0;
  return {
    moved: true,
    game: hydratePuzzleGame({
      ...game,
      order,
      moveCount: (Number(game.moveCount) || 0) + 1,
      message: '残片已滑入空位，继续复原整幅图。'
    })
  };
}

function normalizeEnvelopePiece(piece, index) {
  if (typeof piece === 'string') {
    return { id: `piece-${index}`, char: piece, code: String.fromCharCode(65 + index), targetIndex: null, used: false };
  }
  return {
    ...piece,
    id: piece.id || `piece-${index}`,
    code: piece.code || String.fromCharCode(65 + index),
    used: false
  };
}

function createEnvelopeGame(config) {
  const answer = config.answer || '';
  const lowerHalves = config.lowerHalves || answer.split('').map((char) => ({ char }));
  return {
    answer,
    hint: config.hint,
    slots: lowerHalves.map((item, index) => ({
      index,
      lowerChar: typeof item === 'string' ? item : item.char,
      label: typeof item === 'string' ? `第 ${index + 1} 字` : (item.label || `第 ${index + 1} 字`),
      pieceId: '',
      upperChar: '',
      pieceCode: ''
    })),
    pieces: (config.pieces || []).map(normalizeEnvelopePiece),
    attempts: 0,
    message: '选择上半字块，依次覆盖到三个残字上。'
  };
}

function placeEnvelopePiece(game, pieceIndex) {
  const pieces = game.pieces.map((piece) => ({ ...piece }));
  const slots = game.slots.map((slot) => ({ ...slot }));
  const piece = pieces[pieceIndex];
  const slotIndex = slots.findIndex((slot) => !slot.pieceId);
  if (!piece || piece.used || slotIndex < 0) return { ...game, pieces, slots };
  piece.used = true;
  slots[slotIndex] = {
    ...slots[slotIndex],
    pieceId: piece.id,
    upperChar: piece.char,
    pieceCode: piece.code
  };
  return {
    ...game,
    pieces,
    slots,
    message: `字块 ${piece.code} 已覆盖到第 ${slotIndex + 1} 个残字。`
  };
}

function removeEnvelopePiece(game, slotIndex) {
  const pieces = game.pieces.map((piece) => ({ ...piece }));
  const slots = game.slots.map((slot) => ({ ...slot }));
  const slot = slots[slotIndex];
  if (!slot || !slot.pieceId) return { ...game, pieces, slots };
  const piece = pieces.find((item) => item.id === slot.pieceId);
  if (piece) piece.used = false;
  slots[slotIndex] = { ...slot, pieceId: '', upperChar: '', pieceCode: '' };
  return {
    ...game,
    pieces,
    slots,
    message: `第 ${slotIndex + 1} 个上半字块已撤回。`
  };
}

function isEnvelopeSolved(game) {
  return game.slots.every((slot, slotIndex) => {
    const piece = game.pieces.find((item) => item.id === slot.pieceId);
    return piece && piece.targetIndex === slotIndex;
  });
}

function isMazeRotationAligned(module, rotation, expected) {
  const cycle = module.shape === 'straight' ? 180 : 360;
  return ((rotation - expected) % cycle + cycle) % cycle === 0;
}

function hydrateMazeGame(game) {
  const rotations = (game.rotations || []).slice();
  const target = game.target || [];
  let routeOpen = true;
  const modules = (game.modules || []).map((module, index) => {
    const rotation = rotations[index] || 0;
    const expected = target[index] || 0;
    const aligned = isMazeRotationAligned(module, rotation, expected);
    const connected = routeOpen && aligned;
    routeOpen = connected;
    return {
      ...module,
      index,
      rotation,
      target: expected,
      aligned,
      connected,
      rotationText: `${rotation}°`
    };
  });
  const timelinePicked = (game.timelinePicked || []).slice();
  const timelineEvents = (game.timelineEvents || []).map((event) => ({
    ...event,
    used: timelinePicked.includes(event.id)
  }));
  const timelineSlots = (game.timelineAnswer || []).map((answerId, index) => {
    const eventId = timelinePicked[index] || '';
    const event = timelineEvents.find((item) => item.id === eventId);
    return {
      index,
      answerId,
      eventId,
      year: event ? event.year : '',
      label: event ? event.label : '待排序'
    };
  });
  return {
    ...game,
    rotations,
    modules,
    connectedCount: modules.filter((module) => module.connected).length,
    phase: game.phase || 'maze',
    mazeSolved: Boolean(game.mazeSolved),
    timelinePicked,
    timelineEvents,
    timelineSlots
  };
}

function pickTimelineEvent(game, eventIndex) {
  const event = game.timelineEvents[eventIndex];
  if (!event || event.used || game.timelinePicked.length >= game.timelineAnswer.length) return hydrateMazeGame(game);
  return hydrateMazeGame({
    ...game,
    timelinePicked: [...game.timelinePicked, event.id],
    message: `已放入 ${game.timelinePicked.length + 1}/${game.timelineAnswer.length} 条时间记录。`
  });
}

function removeTimelineEvent(game, slotIndex) {
  const timelinePicked = game.timelinePicked.slice();
  if (!timelinePicked[slotIndex]) return hydrateMazeGame(game);
  timelinePicked.splice(slotIndex, 1);
  return hydrateMazeGame({ ...game, timelinePicked, message: '时间记录已撤回，可重新排序。' });
}

function isTimelineSolved(game) {
  return game.timelineAnswer.length > 0
    && game.timelinePicked.length === game.timelineAnswer.length
    && game.timelinePicked.every((id, index) => id === game.timelineAnswer[index]);
}

module.exports = {
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
};
