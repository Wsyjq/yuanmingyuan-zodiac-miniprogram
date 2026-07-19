const storage = require('../utils/storage');
const { nowIso } = require('../utils/time');
const { bootstrap } = require('../mock/zodiac-route');

function currentSessionKey(routeId) {
  return `zodiac.currentSession.${routeId}`;
}

function recordsKey(routeId) {
  return `zodiac.records.${routeId}`;
}

function recordDetailKey(recordId) {
  return `zodiac.record.${recordId}`;
}

function getBootstrap(routeId) {
  if (!routeId || routeId === bootstrap.route.routeId) return bootstrap;
  return bootstrap;
}

function getRoute(routeId) {
  return getBootstrap(routeId).route;
}

function getStage(routeId, stageId) {
  return getRoute(routeId).stages.find((stage) => stage.stageId === stageId);
}

function getNextStage(routeId, stageId) {
  const stages = getRoute(routeId).stages;
  const index = stages.findIndex((stage) => stage.stageId === stageId);
  return index >= 0 ? stages[index + 1] || null : null;
}

function getCurrentSession(routeId) {
  const session = storage.get(currentSessionKey(routeId), null);
  if (!session || session.status !== 'in_progress') return null;
  return session;
}

function saveCurrentSession(session) {
  storage.set(currentSessionKey(session.routeId), session);
  return session;
}

function getRecords(routeId) {
  return storage.get(recordsKey(routeId), []);
}

function getRecordDetail(recordId) {
  return storage.get(recordDetailKey(recordId), null);
}

function countMarkedStages(session) {
  return Object.keys(session.stages || {}).filter((stageId) => session.stages[stageId].mark).length;
}

function toRecordSummary(session) {
  const route = getRoute(session.routeId);
  const completedStageCount = Object.keys(session.stages || {}).length;
  return {
    recordId: session.recordId || session.sessionId,
    routeId: session.routeId,
    routeTitle: route.title,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt || null,
    completedStageCount,
    totalStageCount: route.stages.length,
    markCount: countMarkedStages(session)
  };
}

function appendRecord(session) {
  const summary = toRecordSummary(session);
  const records = getRecords(session.routeId).filter((record) => record.recordId !== summary.recordId);
  records.unshift(summary);
  storage.set(recordsKey(session.routeId), records);
  storage.set(recordDetailKey(summary.recordId), {
    ...summary,
    stages: Object.keys(session.stages || {}).map((stageId) => session.stages[stageId]),
    final: session.final || { completed: false, placedMarks: [] }
  });
  return summary;
}

function abandonCurrentSession(routeId) {
  const session = getCurrentSession(routeId);
  if (!session) return null;
  session.status = 'abandoned';
  session.endedAt = nowIso();
  appendRecord(session);
  storage.remove(currentSessionKey(routeId));
  return session;
}

function createSession(routeId) {
  const route = getRoute(routeId);
  const firstStage = route.stages[0];
  const timestamp = Date.now();
  return {
    sessionId: `local_${timestamp}`,
    recordId: `record_${timestamp}`,
    routeId,
    status: 'in_progress',
    currentStageId: firstStage.stageId,
    startedAt: nowIso(),
    endedAt: null,
    stages: {},
    final: {
      completed: false,
      placedMarks: []
    }
  };
}

function startSession(routeId, options = {}) {
  if (options.restart) abandonCurrentSession(routeId);
  const existing = getCurrentSession(routeId);
  if (existing && !options.forceNew) return existing;
  if (existing && options.forceNew) abandonCurrentSession(routeId);
  return saveCurrentSession(createSession(routeId));
}

function resolveMarkForProgress(routeId, stage, status) {
  if (status === 'completed') return stage.mark.zodiac;
  const skipRule = getBootstrap(routeId).skipRule;
  return skipRule.givesMark ? stage.mark.zodiac : null;
}

function saveStageProgress(sessionId, stageId, payload) {
  const routeId = payload.routeId || bootstrap.route.routeId;
  const session = getCurrentSession(routeId);
  if (!session || session.sessionId !== sessionId) return null;
  const stage = getStage(routeId, stageId);
  if (!stage) return null;

  const status = payload.status || 'completed';
  const completedAt = payload.completedAt || nowIso();
  const mark = resolveMarkForProgress(routeId, stage, status);

  session.stages[stageId] = {
    sessionId,
    routeId,
    stageId,
    status,
    action: payload.action || (status === 'skipped' ? 'skip' : 'complete'),
    mark,
    completedAt
  };

  const nextStage = getNextStage(routeId, stageId);
  if (nextStage) session.currentStageId = nextStage.stageId;
  saveCurrentSession(session);

  return {
    session,
    nextStageId: nextStage ? nextStage.stageId : null
  };
}

function getCollectedMarks(session) {
  if (!session) return [];
  return Object.keys(session.stages || {})
    .map((stageId) => session.stages[stageId].mark)
    .filter(Boolean);
}

function endSession(sessionId, payload = {}) {
  const routeId = payload.routeId || bootstrap.route.routeId;
  const session = getCurrentSession(routeId);
  if (!session || session.sessionId !== sessionId) return null;
  session.status = 'completed';
  session.endedAt = payload.endedAt || nowIso();
  session.final = {
    completed: true,
    placedMarks: payload.placedMarks || getCollectedMarks(session),
    completedAt: payload.completedAt || nowIso()
  };
  appendRecord(session);
  storage.remove(currentSessionKey(routeId));
  return session;
}

function buildProgress(route, session) {
  const stages = route.stages.map((stage) => {
    const progress = session && session.stages ? session.stages[stage.stageId] : null;
    const isCurrent = session && session.currentStageId === stage.stageId;
    return {
      ...stage,
      progressStatus: progress ? progress.status : isCurrent ? 'in_progress' : 'not_started',
      markCollected: Boolean(progress && progress.mark)
    };
  });

  const completedCount = stages.filter((stage) => stage.progressStatus === 'completed' || stage.progressStatus === 'skipped').length;
  const marks = session ? getCollectedMarks(session) : [];

  return {
    stages,
    completedCount,
    totalCount: route.stages.length,
    marks
  };
}

function resetLocal(routeId) {
  const records = getRecords(routeId);
  records.forEach((record) => storage.remove(recordDetailKey(record.recordId)));
  storage.remove(recordsKey(routeId));
  storage.remove(currentSessionKey(routeId));
}

module.exports = {
  getBootstrap,
  getRoute,
  getStage,
  getNextStage,
  getCurrentSession,
  startSession,
  abandonCurrentSession,
  saveStageProgress,
  endSession,
  getRecords,
  getRecordDetail,
  buildProgress,
  getCollectedMarks,
  resetLocal
};
