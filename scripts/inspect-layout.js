const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

let automator;
try {
  automator = require('miniprogram-automator');
} catch (error) {
  console.error('Missing dependency: miniprogram-automator. Run `npm install` in the repository root first.');
  process.exit(1);
}

const projectPath = path.resolve(__dirname, '..');
const cliPath = process.env.WECHAT_DEVTOOLS_CLI || '';
const idePort = Number(process.env.WECHAT_IDE_PORT || 9420);
const autoPort = Number(process.env.WECHAT_AUTO_PORT || 9421);
const routeId = 'zodiac-return';

const stages = [
  { id: 'p1', name: 'dashuifa', selectors: ['.dashuifa-puzzle', '.puzzle-tile', '.puzzle-tile.blank', '.btn-secondary', '.btn-primary'], counts: { '.puzzle-tile': 9, '.puzzle-tile.blank': 1 } },
  { id: 'p2', name: 'rain', selectors: ['.rain-catch-game', '.rain-panel', '.rain-track', '.track-lane', '.falling-drop', '.tray', '.btn-primary'], counts: { '.track-lane': 5, '.falling-drop': 1, '.tray': 1 } },
  { id: 'p3', name: 'envelope', selectors: ['.envelope-word-game', '.slot', '.character-frame', '.piece', '.btn-secondary', '.btn-primary'], counts: { '.slot': 3, '.character-frame': 3, '.piece': 6 } },
  { id: 'p4', name: 'clock', selectors: ['.clock-match-game', '.pair-columns', '.pair-col', '.choice'], counts: { '.pair-col': 2, '.choice': 24 } },
  { id: 'p5', name: 'password', selectors: ['.password-clue-game', '.evidence-tab', '.evidence-workspace', '.evidence-mark', '.password-slot', '.btn-primary'] },
  { id: 'p6', name: 'order', selectors: ['.sandtable-order-game', '.order-line', '.order-slot', '.piece', '.btn-secondary', '.btn-primary'], counts: { '.order-slot': 12, '.piece': 12 } },
  { id: 'p7', name: 'maze', selectors: ['.maze-path-game', '.maze-module', '.maze-road', '.maze-hint', '.btn-primary'], counts: { '.maze-module': 6, '.maze-road': 6 } },
  { id: 'p7', name: 'maze-timeline', phase: 'timeline', selectors: ['.maze-path-game', '.timeline-slot', '.timeline-card', '.maze-hint', '.btn-secondary', '.btn-primary'], counts: { '.timeline-slot': 5, '.timeline-card': 5 } },
  { id: 'p8', name: 'final', selectors: ['.final-zodiac-board', '.final-hero', '.horse-button', '.mark-token', '.zodiac-slot', '.btn-primary'] }
];

function step(message) {
  console.log(`[layout] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, label, timeout = 10000) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeout}ms`)), timeout);
    })
  ]);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runCli(args) {
  if (!cliPath || !fs.existsSync(cliPath)) {
    throw new Error('WeChat DevTools CLI not found. Set WECHAT_DEVTOOLS_CLI to the cli.bat path.');
  }
  const command = process.platform === 'win32' ? 'cmd.exe' : cliPath;
  const commandArgs = process.platform === 'win32' ? ['/c', cliPath, ...args] : args;
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', cwd: projectPath });
  if (result.status !== 0) throw new Error(`DevTools CLI failed: ${args.join(' ')}`);
}

function bootDevTools() {
  if (process.env.SKIP_DEVTOOLS_BOOT === '1') return;
  step(`open DevTools on ${idePort}`);
  runCli(['open', '--project', projectPath, '--port', String(idePort), '--trust-project']);
  step(`enable automation on ${autoPort}`);
  runCli(['auto', '--project', projectPath, '--port', String(idePort), '--auto-port', String(autoPort), '--trust-project']);
}

async function connectAutomator() {
  const endpoint = `ws://127.0.0.1:${autoPort}`;
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < 30000) {
    try {
      return await withTimeout(automator.connect({ wsEndpoint: endpoint }), 'connect attempt', 5000);
    } catch (error) {
      lastError = error;
      await sleep(500);
    }
  }
  throw lastError || new Error(`Failed connecting to ${endpoint}`);
}

async function clearDevToolsStartupNoise(miniProgram) {
  await miniProgram.evaluate(() => console.clear());
  let lastConsoleAt = 0;
  let startupMessageCount = 0;
  const onConsole = () => {
    startupMessageCount += 1;
    lastConsoleAt = Date.now();
  };
  miniProgram.on('console', onConsole);
  const started = Date.now();
  while (Date.now() - started < 3500) {
    if (lastConsoleAt && Date.now() - lastConsoleAt >= 1500) break;
    await sleep(50);
  }
  miniProgram.removeListener('console', onConsole);
  await miniProgram.evaluate(() => console.clear());
  return startupMessageCount;
}

let routeRequestSequence = 0;

async function routeTo(miniProgram, stageId) {
  let state = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    routeRequestSequence += 1;
    const request = {
      token: `layout-route-${routeRequestSequence}`,
      url: `/pages/zodiac/stage/index?routeId=${routeId}&stageId=${stageId}`
    };
    await withTimeout(miniProgram.evaluate((navigation) => {
      const page = getCurrentPages().slice(-1)[0];
      if (page) page.__layoutRouteToken = navigation.token;
      wx.reLaunch({ url: navigation.url });
    }, request), `${stageId} reLaunch attempt ${attempt}`);
    const started = Date.now();
    while (Date.now() - started < 7000) {
      state = await withTimeout(miniProgram.evaluate((navigationToken) => {
        const page = getCurrentPages().slice(-1)[0];
        const component = page && page.selectComponent && page.selectComponent('#active-game');
        return {
          route: page && page.route,
          stageId: page && page.data.stage && page.data.stage.stageId,
          hasActiveGame: Boolean(component),
          pageReplaced: Boolean(page && page.__layoutRouteToken !== navigationToken)
        };
      }, request.token), `${stageId} readiness check`);
      if (state.pageReplaced && state.route === 'pages/zodiac/stage/index' && state.stageId === stageId && state.hasActiveGame) return;
      await sleep(120);
    }
  }
  throw new Error(`Timed out waiting for ${stageId} active game: ${JSON.stringify(state)}`);
}

async function seedFinalSession(miniProgram) {
  await miniProgram.evaluate((id) => {
    const now = new Date().toISOString();
    const markByStage = {
      p1: '\u725b',
      p2: '\u7334',
      p3: '\u864e',
      p4: '\u732a',
      p5: '\u9f20',
      p6: '\u5154',
      p7: '\u9f99'
    };
    const session = {
      sessionId: 'layout_inspect_session',
      recordId: 'layout_inspect_record',
      routeId: id,
      status: 'in_progress',
      currentStageId: 'p8',
      startedAt: now,
      endedAt: null,
      stages: {},
      final: { completed: false, placedMarks: [] }
    };
    Object.keys(markByStage).forEach((stageId) => {
      session.stages[stageId] = {
        sessionId: session.sessionId,
        routeId: id,
        stageId,
        status: 'completed',
        action: 'layout-inspect',
        mark: markByStage[stageId],
        completedAt: now
      };
    });
    wx.setStorageSync(`zodiac.currentSession.${id}`, session);
  }, routeId);
}

async function captureCurrentSession(miniProgram) {
  return await miniProgram.evaluate((key) => {
    const exists = wx.getStorageInfoSync().keys.indexOf(key) >= 0;
    return { exists, value: exists ? wx.getStorageSync(key) : null };
  }, `zodiac.currentSession.${routeId}`);
}

async function restoreCurrentSession(miniProgram, fixture) {
  await miniProgram.evaluate((payload) => {
    if (payload.fixture.exists) wx.setStorageSync(payload.key, payload.fixture.value);
    else wx.removeStorageSync(payload.key);
  }, { key: `zodiac.currentSession.${routeId}`, fixture });
}

function rectOverlap(a, b) {
  const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return x > 1 && y > 1;
}

function shortRect(rect) {
  return `x=${rect.left.toFixed(1)}..${rect.right.toFixed(1)} y=${rect.top.toFixed(1)}..${rect.bottom.toFixed(1)} w=${rect.width.toFixed(1)} h=${rect.height.toFixed(1)}`;
}

function checkGroup(stage, selector, rects, container, viewportWidth) {
  const issues = [];
  rects.forEach((rect, index) => {
    if (rect.width <= 1 || rect.height <= 1) {
      issues.push(`${selector}[${index}] collapsed: ${shortRect(rect)}`);
    }
    if (rect.left < container.left - 1 || rect.right > container.right + 1) {
      issues.push(`${selector}[${index}] outside component: ${shortRect(rect)} component=${shortRect(container)}`);
    }
    if (rect.left < -1 || rect.right > viewportWidth + 1) {
      issues.push(`${selector}[${index}] outside viewport width ${viewportWidth}: ${shortRect(rect)}`);
    }
  });
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      if (rectOverlap(rects[i], rects[j])) {
        issues.push(`${selector}[${i}] overlaps ${selector}[${j}]: ${shortRect(rects[i])} vs ${shortRect(rects[j])}`);
      }
    }
  }
  if (issues.length) return issues.map((issue) => `${stage.id}/${stage.name} ${issue}`);
  return [];
}

function checkStage(stage, payload) {
  const issues = [];
  const viewportWidth = payload.system.windowWidth;
  const component = payload.rects[stage.selectors[0]] && payload.rects[stage.selectors[0]][0];
  if (!component) return [`${stage.id}/${stage.name} missing component root ${stage.selectors[0]}`];
  if (component.left < -1 || component.right > viewportWidth + 1) {
    issues.push(`${stage.id}/${stage.name} component outside viewport width ${viewportWidth}: ${shortRect(component)}`);
  }
  Object.entries(stage.counts || {}).forEach(([selector, expected]) => {
    const actual = (payload.rects[selector] || []).length;
    if (actual !== expected) issues.push(`${stage.id}/${stage.name} expected ${expected} ${selector} elements, got ${actual}`);
  });
  stage.selectors.slice(1).forEach((selector) => {
    const rects = payload.rects[selector] || [];
    if (!rects.length) {
      issues.push(`${stage.id}/${stage.name} missing selector ${selector}`);
      return;
    }
    issues.push(...checkGroup(stage, selector, rects, component, viewportWidth));
  });
  if (stage.id === 'p2') {
    const track = payload.rects['.rain-track'] && payload.rects['.rain-track'][0];
    const drop = payload.rects['.falling-drop'] && payload.rects['.falling-drop'][0];
    const tray = payload.rects['.tray'] && payload.rects['.tray'][0];
    if (!drop) issues.push(`${stage.id}/${stage.name} missing active falling drop`);
    [drop, tray].filter(Boolean).forEach((rect, index) => {
      if (track && (rect.left < track.left - 1 || rect.right > track.right + 1 || rect.top < track.top - 1 || rect.bottom > track.bottom + 1)) {
        issues.push(`${stage.id}/${stage.name} ${index === 0 ? 'drop' : 'tray'} outside rain track: ${shortRect(rect)} track=${shortRect(track)}`);
      }
    });
  }
  return issues;
}

let layoutRequestSequence = 0;

async function queryStageLayout(miniProgram, stage) {
  layoutRequestSequence += 1;
  const request = {
    id: `${stage.id}:${stage.name}:${layoutRequestSequence}`,
    selectors: stage.selectors
  };
  await withTimeout(miniProgram.evaluate((layoutRequest) => {
    const page = getCurrentPages().slice(-1)[0];
    const component = page && page.selectComponent && page.selectComponent('#active-game');
    page.__layoutInspection = { id: layoutRequest.id, pending: true };
    if (!component) {
      page.__layoutInspection = {
        id: layoutRequest.id,
        pending: false,
        payload: { error: 'missing #active-game', route: page && page.route }
      };
      return;
    }
    const runQuery = () => {
      const query = component.createSelectorQuery();
      layoutRequest.selectors.forEach((selector) => query.selectAll(selector).boundingClientRect());
      query.exec((results) => {
        const rects = {};
        layoutRequest.selectors.forEach((selector, index) => {
          rects[selector] = results[index] || [];
        });
        page.__layoutInspection = {
          id: layoutRequest.id,
          pending: false,
          payload: {
            route: page.route,
            gameType: page.data.gameType,
            stageId: page.data.stage && page.data.stage.stageId,
            system: wx.getWindowInfo(),
            rects
          }
        };
      });
    };
    if (typeof wx.nextTick === 'function') wx.nextTick(runQuery);
    else setTimeout(runQuery, 0);
  }, request), `${stage.id}/${stage.name} selector query setup`);

  const started = Date.now();
  while (Date.now() - started < 10000) {
    const payload = await withTimeout(miniProgram.evaluate((requestId) => {
      const page = getCurrentPages().slice(-1)[0];
      const inspection = page && page.__layoutInspection;
      if (!inspection || inspection.id !== requestId || inspection.pending) return null;
      delete page.__layoutInspection;
      return inspection.payload;
    }, request.id), `${stage.id}/${stage.name} selector query result`);
    if (payload) return payload;
    await sleep(80);
  }
  throw new Error(`${stage.id}/${stage.name} selector query did not complete`);
}

async function prepareStage(miniProgram, stage) {
  if (stage.id === 'p1') {
    await routeTo(miniProgram, stage.id);
  } else {
    if (stage.id === 'p8') await seedFinalSession(miniProgram);
    await withTimeout(miniProgram.evaluate((fixture) => {
      const page = getCurrentPages().slice(-1)[0];
      const session = fixture.stageId === 'p8'
        ? wx.getStorageSync(`zodiac.currentSession.${fixture.routeId}`)
        : page.data.session;
      page.loadStage(fixture.routeId, fixture.stageId, session, page.data.route);
    }, { routeId, stageId: stage.id }), `${stage.id} fixture setup`);
    await withTimeout(miniProgram.evaluate(() => new Promise((resolve) => wx.nextTick(resolve))), `${stage.id} fixture render`);
  }
  const expectedGameType = stage.id === 'p8' ? 'final' : stage.name === 'maze-timeline' ? 'maze' : stage.name;
  const stageStarted = Date.now();
  let stageReady = false;
  while (Date.now() - stageStarted < 5000) {
    stageReady = await withTimeout(miniProgram.evaluate((fixture) => {
      const page = getCurrentPages().slice(-1)[0];
      const component = page && page.selectComponent && page.selectComponent('#active-game');
      return Boolean(page && page.data.stage && page.data.stage.stageId === fixture.stageId
        && page.data.gameType === fixture.gameType && component);
    }, { stageId: stage.id, gameType: expectedGameType }), `${stage.id} fixture readiness`);
    if (stageReady) break;
    await sleep(80);
  }
  assert(stageReady, `Timed out preparing the ${stage.id} ${stage.name} layout fixture`);
  if (stage.phase === 'timeline') {
    await withTimeout(miniProgram.evaluate(() => {
      const page = getCurrentPages().slice(-1)[0];
      page.setData({ 'game.rotations': page.data.game.target.slice() });
    }), 'p7 timeline target setup');
    const started = Date.now();
    let ready = false;
    while (Date.now() - started < 5000) {
      ready = await withTimeout(miniProgram.evaluate(() => {
        const game = getCurrentPages().slice(-1)[0].data.game;
        return game.rotations.join(',') === game.target.join(',');
      }), 'p7 timeline target readiness');
      if (ready) break;
      await sleep(80);
    }
    assert(ready, 'Timed out preparing the p7 timeline layout state');
    await withTimeout(miniProgram.evaluate(() => getCurrentPages().slice(-1)[0].checkMaze()), 'p7 timeline phase trigger');
    const phaseStarted = Date.now();
    let phase = '';
    while (Date.now() - phaseStarted < 5000) {
      phase = await withTimeout(miniProgram.evaluate(() => getCurrentPages().slice(-1)[0].data.game.phase), 'p7 timeline phase readiness');
      if (phase === 'timeline') break;
      await sleep(80);
    }
    assert(phase === 'timeline', `Expected p7 timeline phase, got ${phase}`);
  }
  if (stage.id === 'p2') {
    await miniProgram.evaluate(() => {
      const page = getCurrentPages().slice(-1)[0];
      const component = page && page.selectComponent && page.selectComponent('#active-game');
      if (component) {
        component.clearTimers();
        component.setData({
          running: true,
          activeDrop: true,
          currentDrop: { lane: 2, type: 'good' },
          dropStyle: 'left: 50%; top: 16%; opacity: 1;',
          statusText: '布局检查固定雨露',
          roundText: '布局检查固定轮次'
        });
      }
    });
    const started = Date.now();
    while (Date.now() - started < 3000) {
      const active = await miniProgram.evaluate(() => {
        const page = getCurrentPages().slice(-1)[0];
        const component = page && page.selectComponent && page.selectComponent('#active-game');
        return Boolean(component && component.data.activeDrop);
      });
      if (active) break;
      await sleep(80);
    }
  }
}

async function cleanupStage(miniProgram, stage) {
  if (stage.id === 'p2') {
    await miniProgram.evaluate(() => {
      const page = getCurrentPages().slice(-1)[0];
      const component = page && page.selectComponent && page.selectComponent('#active-game');
      if (component) component.stopGame('布局检查完成');
    });
  }
}

async function main() {
  bootDevTools();
  let miniProgram = await connectAutomator();
  const startupMessageCount = await clearDevToolsStartupNoise(miniProgram);
  console.log(`[layout] cleared ${startupMessageCount} DevTools startup console messages`);
  const currentSessionFixture = await captureCurrentSession(miniProgram);
  const allIssues = [];
  try {
    for (const stage of stages) {
      step(`inspect ${stage.id} ${stage.name}`);
      await prepareStage(miniProgram, stage);
      const payload = await queryStageLayout(miniProgram, stage);
      await cleanupStage(miniProgram, stage);
      assert(!payload.error, `${stage.id} inspection failed: ${payload.error}`);
      assert(payload.stageId === stage.id, `Expected ${stage.id}, got ${payload.stageId}`);
      const issues = checkStage(stage, payload);
      const root = payload.rects[stage.selectors[0]][0];
      console.log(`  ${stage.id} ${stage.name}: ${shortRect(root)}; issues=${issues.length}`);
      allIssues.push(...issues);
    }
  } finally {
    try {
      await restoreCurrentSession(miniProgram, currentSessionFixture);
      const restoredFixture = await captureCurrentSession(miniProgram);
      assert(restoredFixture.exists === currentSessionFixture.exists
        && JSON.stringify(restoredFixture.value) === JSON.stringify(currentSessionFixture.value), 'Layout inspection did not restore the original current session');
    } finally {
      await miniProgram.disconnect();
    }
  }
  if (allIssues.length) {
    console.error('LAYOUT_INSPECTION_FAILED');
    allIssues.forEach((issue) => console.error(`- ${issue}`));
    process.exit(1);
  }
  console.log('LAYOUT_INSPECTION_PASSED');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
