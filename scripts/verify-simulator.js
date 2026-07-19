const fs = require('fs');
const path = require('path');
const util = require('util');
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
const prototypeRoute = 'dev-zodiac-ui-prototype/pages/index/index';
const prototypeScreenIds = ['PRO-01', 'HHZ-05', 'DSF-05', 'HUG-08'];
const canonicalZodiacOrder = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const canonicalClock = { 鼠: '子', 牛: '丑', 虎: '寅', 兔: '卯', 龙: '辰', 蛇: '巳', 马: '午', 羊: '未', 猴: '申', 鸡: '酉', 狗: '戌', 猪: '亥' };
const canonicalTimelineAnswer = ['ox-tiger-monkey', 'pig', 'mouse-rabbit', 'horse', 'dragon'];
const canonicalTimelineYears = { 'ox-tiger-monkey': '2000', pig: '2003', 'mouse-rabbit': '2013', horse: '2019', dragon: '至今' };
let activeStep = 'startup';
let routeRequestSequence = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function step(message) {
  activeStep = message;
  console.log(`[sim-service] ${message}`);
}

function formatConsoleArg(arg) {
  if (!arg || typeof arg !== 'object') return String(arg);
  const details = {};
  ['name', 'message', 'stack', 'errMsg'].forEach((key) => {
    if (arg[key]) details[key] = arg[key];
  });
  if (Object.keys(details).length) return JSON.stringify(details);
  const value = JSON.stringify(arg);
  return value === '{}' ? util.inspect(arg, { depth: 6, showHidden: true }) : value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, label, timeout = 30000) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeout}ms`)), timeout);
    })
  ]);
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

async function appState(miniProgram) {
  return await miniProgram.evaluate(() => {
    const pages = getCurrentPages();
    const page = pages[pages.length - 1];
    return {
      routes: pages.map((item) => item.route),
      route: page && page.route,
      routeToken: page && page.__simulatorRouteToken,
      data: page && page.data
    };
  });
}

async function routeTo(miniProgram, url, timeout = 20000) {
  const targetRoute = url.replace(/^\//, '').split('?')[0];
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    routeRequestSequence += 1;
    const request = { url, token: `simulator-route-${routeRequestSequence}` };
    await withTimeout(miniProgram.evaluate((navigation) => {
      const page = getCurrentPages().slice(-1)[0];
      if (page) page.__simulatorRouteToken = navigation.token;
      wx.reLaunch({ url: navigation.url });
    }, request), `${targetRoute} reLaunch attempt ${attempt}`, 10000);
    try {
      await waitForRoute(miniProgram, targetRoute, Math.min(timeout, 7000), request.token);
      await sleep(200);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`Failed routing to ${targetRoute}`);
}

async function waitForRoute(miniProgram, route, timeout = 20000, staleToken = '') {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const state = await appState(miniProgram);
    if (state.route === route && (!staleToken || state.routeToken !== staleToken)) return state;
    await sleep(120);
  }
  const state = await appState(miniProgram);
  throw new Error(`Expected route ${route}, got ${state.route}; stack=${JSON.stringify(state.routes)}`);
}

async function waitForPrototypeAssets(miniProgram, expectedCount, timeout = 10000) {
  const started = Date.now();
  let state = null;
  while (Date.now() - started < timeout) {
    state = await appState(miniProgram);
    const loaded = state.data && state.data.loadedAssetIds;
    const failed = state.data && state.data.failedAssetIds;
    if (Array.isArray(failed) && failed.length) return state;
    if (Array.isArray(loaded) && loaded.length === expectedCount) return state;
    await sleep(80);
  }
  return state || await appState(miniProgram);
}

async function waitForStage(miniProgram, stageId, timeout = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const state = await appState(miniProgram);
    const current = state.data && state.data.stage && state.data.stage.stageId;
    if (current === stageId) return state;
    await sleep(120);
  }
  const state = await appState(miniProgram);
  const current = state.data && state.data.stage && state.data.stage.stageId;
  throw new Error(`Expected stage ${stageId}, got ${current}`);
}

async function callPage(miniProgram, method, event = {}) {
  return await miniProgram.evaluate((name, arg) => {
    const pages = getCurrentPages();
    const page = pages[pages.length - 1];
    if (!page || typeof page[name] !== 'function') throw new Error(`Missing page method ${name}`);
    return page[name](arg);
  }, method, event);
}

async function callActiveComponent(miniProgram, method, argument) {
  return await miniProgram.evaluate((name, arg) => {
    const pages = getCurrentPages();
    const page = pages[pages.length - 1];
    const component = page && page.selectComponent && page.selectComponent('#active-game');
    if (!component || typeof component[name] !== 'function') throw new Error(`Missing active component method ${name}`);
    return component[name](arg);
  }, method, argument);
}

async function activeComponentData(miniProgram) {
  return await miniProgram.evaluate(() => {
    const page = getCurrentPages().slice(-1)[0];
    const component = page && page.selectComponent && page.selectComponent('#active-game');
    return component ? component.data : null;
  });
}

async function waitForRecords(miniProgram, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const records = unwrapStorageValue(await miniProgram.callWxMethod('getStorageSync', `zodiac.records.${routeId}`));
    if (Array.isArray(records) && records.length > 0) return records;
    await sleep(120);
  }
  return unwrapStorageValue(await miniProgram.callWxMethod('getStorageSync', `zodiac.records.${routeId}`));
}

async function resetZodiacStorage(miniProgram) {
  await miniProgram.evaluate((id) => {
    wx.getStorageInfoSync().keys
      .filter((key) => key === `zodiac.currentSession.${id}` || key === `zodiac.records.${id}` || key.startsWith('zodiac.record.'))
      .forEach((key) => wx.removeStorageSync(key));
  }, routeId);
}

function unwrapStorageValue(value) {
  if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'data')) return value.data;
  return value;
}

function eventDetail(detail) {
  return { detail, currentTarget: { dataset: detail || {} } };
}

function eventDataset(dataset) {
  return { currentTarget: { dataset } };
}

async function snapshotStorage(miniProgram) {
  return await miniProgram.evaluate(() => {
    const result = {};
    wx.getStorageInfoSync().keys
      .sort()
      .forEach((key) => {
        result[key] = wx.getStorageSync(key);
      });
    return result;
  });
}

async function inspectPrototypeLayout(miniProgram) {
  return await miniProgram.evaluate(() => new Promise((resolve) => {
    const page = getCurrentPages().slice(-1)[0];
    const query = page.createSelectorQuery();
    query.select('.prototype-page').boundingClientRect();
    query.select('.screen-frame').boundingClientRect();
    query.selectAll('.screen-option').boundingClientRect();
    query.selectAll('.mode-option').boundingClientRect();
    query.selectAll('.token-item').boundingClientRect();
    query.selectAll('.product-button').boundingClientRect();
    query.select('.reset-preview').boundingClientRect();
    query.exec((results) => {
      resolve({
        viewport: wx.getWindowInfo(),
        root: results[0],
        frame: results[1],
        screenOptions: results[2] || [],
        modeOptions: results[3] || [],
        tokenItems: results[4] || [],
        productButtons: results[5] || [],
        reset: results[6]
      });
    });
  }));
}

async function inspectPrototypePreview(miniProgram) {
  return await miniProgram.evaluate(() => new Promise((resolve) => {
    const page = getCurrentPages().slice(-1)[0];
    const query = page.createSelectorQuery();
    query.select('.prototype-page.motion-reduced.network-weak.reachability-unreachable').boundingClientRect();
    query.select('.network-banner').boundingClientRect();
    query.select('.unreachable-panel').boundingClientRect();
    query.select('.scene').boundingClientRect();
    query.exec((results) => resolve({
      stateRoot: results[0],
      networkBanner: results[1],
      unreachablePanel: results[2],
      scene: results[3]
    }));
  }));
}

async function inspectPrototypeAssets(miniProgram) {
  return await miniProgram.evaluate(() => new Promise((resolve) => {
    const page = getCurrentPages().slice(-1)[0];
    const query = page.createSelectorQuery();
    query.select('.scene').boundingClientRect();
    query.selectAll('.scene-asset').boundingClientRect();
    query.select('.asset-error').boundingClientRect();
    query.selectAll('.layout-probe').boundingClientRect();
    query.exec((results) => resolve({
      scene: results[0],
      assets: results[1] || [],
      error: results[2],
      probes: results[3] || []
    }));
  }));
}

async function inspectWeakNetworkKeyframe(miniProgram) {
  return await miniProgram.evaluate(() => new Promise((resolve) => {
    const page = getCurrentPages().slice(-1)[0];
    const query = page.createSelectorQuery();
    query.select('.prototype-page.motion-normal.network-weak.reachability-reachable').boundingClientRect();
    query.select('.reconstruction-scene').boundingClientRect();
    query.selectAll('.comparison-image').fields({
      rect: true,
      size: true,
      computedStyle: ['opacity', 'animationName']
    });
    query.exec((results) => resolve({
      stateRoot: results[0],
      scene: results[1],
      assets: results[2] || []
    }));
  }));
}

async function inspectReducedKeyframe(miniProgram) {
  return await miniProgram.evaluate(() => new Promise((resolve) => {
    const page = getCurrentPages().slice(-1)[0];
    const query = page.createSelectorQuery();
    query.select('.prototype-page.motion-reduced.network-normal.reachability-reachable').boundingClientRect();
    query.select('.path-scene').boundingClientRect();
    query.select('.path-artwork').boundingClientRect();
    query.select('.path-focus-seal').boundingClientRect();
    query.exec((results) => resolve({
      stateRoot: results[0],
      scene: results[1],
      resultPath: results[2],
      resultFocus: results[3]
    }));
  }));
}

async function verifyUiPrototype(miniProgram) {
  step('isolated UI prototype deep links');
  const storageBefore = await snapshotStorage(miniProgram);

  for (const screenId of prototypeScreenIds) {
    await routeTo(miniProgram, `/${prototypeRoute}?screen=${screenId}`);
    let state = await appState(miniProgram);
    assert(state.route === prototypeRoute, `Expected prototype route, got ${state.route}`);
    assert(state.data.activeScreenId === screenId, `Expected prototype screen ${screenId}, got ${state.data.activeScreenId}`);
    assert(state.data.screen && state.data.screen.assetLabel === '原型素材', `${screenId} must expose the prototype asset label`);
    assert(state.data.screenOptions.length === 4, `Expected 4 prototype screen options, got ${state.data.screenOptions.length}`);
    assert(state.data.visualTokens.length === 6, `Expected 6 I1 visual tokens, got ${state.data.visualTokens.length}`);
    assert(state.data.viewport.width > 0 && state.data.viewport.height > 0, `${screenId} is missing viewport diagnostics`);
    assert(Array.isArray(state.data.screen.assets) && state.data.screen.assets.length > 0, `${screenId} is missing concept asset metadata`);
    state = await waitForPrototypeAssets(miniProgram, state.data.screen.assets.length);
    assert(state.data.failedAssetIds.length === 0 && state.data.assetFailureMessage === '', `${screenId} reported a concept asset load failure`);
    assert(state.data.loadedAssetIds.length === state.data.screen.assets.length, `${screenId} did not finish loading every concept asset`);
    await callPage(miniProgram, 'onSelectMotion', eventDataset({ value: 'reduced' }));
    await sleep(100);
    state = await appState(miniProgram);
    assert(state.data.motionMode === 'reduced', `${screenId} did not enter the deterministic reduced-motion layout state`);
    const assetLayout = await inspectPrototypeAssets(miniProgram);
    assert(assetLayout.scene, `${screenId} is missing its scene composition`);
    assert(assetLayout.assets.length === state.data.screen.assets.length, `${screenId} expected ${state.data.screen.assets.length} rendered concept assets, got ${assetLayout.assets.length}`);
    assert(!assetLayout.error, `${screenId} rendered the concept asset error fallback`);
    assetLayout.assets.forEach((rect, index) => {
      assert(rect.width > 0 && rect.height > 0, `${screenId} concept asset ${index} has no rendered area`);
    });
    assert(assetLayout.probes.length > 0, `${screenId} has no composition overflow probes`);
    assetLayout.probes.forEach((rect, index) => {
      assert(rect.left >= assetLayout.scene.left - 1 && rect.right <= assetLayout.scene.right + 1, `${screenId} composition probe ${index} overflows horizontally: ${JSON.stringify(rect)}`);
      assert(rect.top >= assetLayout.scene.top - 1 && rect.bottom <= assetLayout.scene.bottom + 1, `${screenId} composition probe ${index} overflows vertically: ${JSON.stringify(rect)}`);
    });
  }

  step('prototype query allowlist and preview controls');
  await routeTo(miniProgram, `/${prototypeRoute}?screen=BAD&motion=fast&network=offline&reachability=hidden`);
  let state = await appState(miniProgram);
  assert(state.data.activeScreenId === 'PRO-01', 'Invalid prototype screen must fall back to PRO-01');
  assert(state.data.motionMode === 'normal' && state.data.networkMode === 'normal' && state.data.reachabilityMode === 'reachable', 'Invalid prototype modes must fall back to defaults');
  assert(state.data.queryWarning.includes('已忽略无效参数'), 'Invalid prototype query must render a warning');

  await routeTo(miniProgram, `/${prototypeRoute}?screen=PRO-01`);
  state = await waitForPrototypeAssets(miniProgram, 1);
  const staleAssetGeneration = state.data.assetGeneration;
  await callPage(miniProgram, 'onSelectScreen', eventDataset({ screenId: 'HHZ-05' }));
  await callPage(miniProgram, 'onSelectScreen', eventDataset({ screenId: 'PRO-01' }));
  state = await appState(miniProgram);
  assert(state.data.assetGeneration !== staleAssetGeneration, 'Returning to a screen must create a new asset generation');
  await callPage(miniProgram, 'onAssetError', eventDataset({
    assetId: 'concept-prologue-ruin-v1',
    assetGeneration: staleAssetGeneration
  }));
  state = await appState(miniProgram);
  assert(state.data.failedAssetIds.length === 0 && state.data.assetFailureMessage === '', 'A stale asset event must not overwrite the active render state');
  const reachableAssetGeneration = state.data.assetGeneration;
  await callPage(miniProgram, 'onSelectReachability', eventDataset({ value: 'unreachable' }));
  await callPage(miniProgram, 'onSelectReachability', eventDataset({ value: 'reachable' }));
  state = await appState(miniProgram);
  assert(state.data.assetGeneration !== reachableAssetGeneration, 'Reachability remounts must create a new asset generation');
  await callPage(miniProgram, 'onAssetError', eventDataset({
    assetId: 'concept-prologue-ruin-v1',
    assetGeneration: reachableAssetGeneration
  }));
  state = await appState(miniProgram);
  assert(state.data.failedAssetIds.length === 0, 'A stale reachability asset event must be ignored');
  const generationBeforeRelaunch = state.data.assetGeneration;
  await routeTo(miniProgram, `/${prototypeRoute}?screen=PRO-01`);
  state = await waitForPrototypeAssets(miniProgram, 1);
  assert(state.data.assetGeneration !== generationBeforeRelaunch, 'Same-route relaunches must create a new asset generation');
  const activeAssetGeneration = state.data.assetGeneration;
  await callPage(miniProgram, 'onAssetError', eventDataset({
    assetId: 'concept-prologue-ruin-v1',
    assetGeneration: activeAssetGeneration
  }));
  state = await appState(miniProgram);
  assert(state.data.failedAssetIds.length === 1 && state.data.assetFailureMessage, 'An active asset failure must enter the fallback state');
  const failedAssetLayout = await inspectPrototypeAssets(miniProgram);
  assert(failedAssetLayout.error, 'An active asset failure must render the fallback banner');
  await callPage(miniProgram, 'onAssetLoad', eventDataset({
    assetId: 'concept-prologue-ruin-v1',
    assetGeneration: activeAssetGeneration
  }));
  state = await appState(miniProgram);
  assert(state.data.failedAssetIds.length === 0 && state.data.assetFailureMessage === '', 'A recovered active asset must clear the fallback state');

  await routeTo(miniProgram, `/${prototypeRoute}?screen=DSF-05&motion=reduced&network=weak&reachability=unreachable`);
  state = await appState(miniProgram);
  assert(state.data.activeScreenId === 'DSF-05', 'Prototype query screen was not applied');
  assert(state.data.motionMode === 'reduced', 'Reduced-motion query was not applied');
  assert(state.data.networkMode === 'weak', 'Weak-network query was not applied');
  assert(state.data.reachabilityMode === 'unreachable', 'Unreachable query was not applied');

  const preview = await inspectPrototypePreview(miniProgram);
  assert(preview.stateRoot, 'Prototype state classes are incomplete');
  assert(preview.networkBanner, 'Weak-network mode must render its fallback banner');
  assert(preview.unreachablePanel, 'Unreachable mode must render alternate field material');
  assert(!preview.scene, 'Unreachable mode must replace the normal scene');

  await callPage(miniProgram, 'onSelectMotion', eventDataset({ value: 'normal' }));
  await callPage(miniProgram, 'onSelectReachability', eventDataset({ value: 'reachable' }));
  state = await waitForPrototypeAssets(miniProgram, 2);
  assert(state.data.failedAssetIds.length === 0, 'Reachable weak-network mode reported an asset failure');
  const weakKeyframe = await inspectWeakNetworkKeyframe(miniProgram);
  assert(weakKeyframe.stateRoot && weakKeyframe.scene, 'Reachable weak-network mode must retain the DSF keyframe');
  assert(weakKeyframe.assets.length === 2, `Reachable weak-network mode expected 2 comparison assets, got ${weakKeyframe.assets.length}`);
  weakKeyframe.assets.forEach((asset, index) => {
    assert(Math.abs(Number(asset.opacity) - 0.46) < 0.02, `Weak-network comparison asset ${index} has opacity ${asset.opacity}`);
    assert(asset.animationName === 'none', `Weak-network comparison asset ${index} still animates with ${asset.animationName}`);
  });

  await callPage(miniProgram, 'onSelectScreen', eventDataset({ screenId: 'HHZ-05' }));
  await callPage(miniProgram, 'onSelectMotion', eventDataset({ value: 'reduced' }));
  await callPage(miniProgram, 'onSelectNetwork', eventDataset({ value: 'normal' }));
  state = await waitForPrototypeAssets(miniProgram, 1);
  assert(state.data.activeScreenId === 'HHZ-05' && state.data.motionMode === 'reduced', 'Reduced-motion keyframe route was not applied');
  const reducedKeyframe = await inspectReducedKeyframe(miniProgram);
  assert(reducedKeyframe.stateRoot && reducedKeyframe.scene, 'Reduced-motion mode must retain the normal HHZ keyframe');
  assert(reducedKeyframe.resultPath && reducedKeyframe.resultFocus, 'Reduced-motion mode must retain the path and center terminal state');

  await callPage(miniProgram, 'onSelectScreen', eventDataset({ screenId: 'HUG-08' }));
  await callPage(miniProgram, 'onSelectMotion', eventDataset({ value: 'normal' }));
  await callPage(miniProgram, 'onSelectNetwork', eventDataset({ value: 'normal' }));
  await callPage(miniProgram, 'onSelectReachability', eventDataset({ value: 'reachable' }));
  state = await appState(miniProgram);
  assert(state.data.activeScreenId === 'HUG-08', 'Prototype screen selector did not switch to HUG-08');
  assert(state.data.motionMode === 'normal' && state.data.networkMode === 'normal' && state.data.reachabilityMode === 'reachable', 'Prototype controls did not restore normal preview modes');

  await callPage(miniProgram, 'onPreviewUtility', eventDataset({ utility: 'map' }));
  state = await appState(miniProgram);
  assert(state.data.previewNotice.includes('路线地图'), 'Product map preview did not render a read-only notice');
  await callPage(miniProgram, 'onProductAction');
  state = await appState(miniProgram);
  assert(state.data.previewNotice.includes(state.data.screen.primaryActionLabel), 'Primary product action did not render a read-only notice');

  const layout = await inspectPrototypeLayout(miniProgram);
  assert(layout.root && layout.frame && layout.reset, 'Prototype layout roots are missing');
  assert(layout.root.left >= -1 && layout.root.right <= layout.viewport.windowWidth + 1, `Prototype root overflows viewport: ${JSON.stringify(layout.root)}`);
  assert(layout.frame.left >= -1 && layout.frame.right <= layout.viewport.windowWidth + 1, `Prototype frame overflows viewport: ${JSON.stringify(layout.frame)}`);
  assert(layout.screenOptions.length === 4, `Expected 4 rendered screen controls, got ${layout.screenOptions.length}`);
  assert(layout.modeOptions.length === 6, `Expected 6 rendered mode controls, got ${layout.modeOptions.length}`);
  assert(layout.tokenItems.length === 6, `Expected 6 rendered visual tokens, got ${layout.tokenItems.length}`);
  assert(layout.productButtons.length === 3, `Expected 3 product chrome buttons, got ${layout.productButtons.length}`);
  layout.screenOptions.concat(layout.modeOptions, layout.productButtons, [layout.reset]).forEach((rect, index) => {
    assert(rect.height >= 43.5, `Prototype control ${index} is shorter than 44px: ${rect.height}`);
  });

  await callPage(miniProgram, 'onResetPreview');
  state = await appState(miniProgram);
  assert(state.data.activeScreenId === 'PRO-01', 'Prototype reset must restore PRO-01');
  assert(state.data.motionMode === 'normal' && state.data.networkMode === 'normal' && state.data.reachabilityMode === 'reachable', 'Prototype reset must restore default modes');
  assert(state.data.previewNotice === '', 'Prototype reset must clear read-only product notices');

  const storageAfter = await snapshotStorage(miniProgram);
  assert(util.isDeepStrictEqual(storageAfter, storageBefore), `Prototype changed app storage:\nbefore=${JSON.stringify(storageBefore)}\nafter=${JSON.stringify(storageAfter)}`);
}

function areGridNeighbors(first, second, columns = 3) {
  const rowDelta = Math.abs(Math.floor(first / columns) - Math.floor(second / columns));
  const columnDelta = Math.abs((first % columns) - (second % columns));
  return rowDelta + columnDelta === 1;
}

function solveSlidingPuzzle(initial, target) {
  const startKey = initial.join(',');
  const targetKey = target.join(',');
  if (startKey === targetKey) return [];

  const queue = [initial.slice()];
  const parents = new Map([[startKey, null]]);
  let cursor = 0;
  while (cursor < queue.length) {
    const order = queue[cursor];
    cursor += 1;
    const previousKey = order.join(',');
    const blankIndex = order.indexOf(0);
    for (let index = 0; index < order.length; index += 1) {
      if (!areGridNeighbors(index, blankIndex)) continue;
      const next = order.slice();
      next[blankIndex] = next[index];
      next[index] = 0;
      const nextKey = next.join(',');
      if (parents.has(nextKey)) continue;
      parents.set(nextKey, { previousKey, move: index });
      if (nextKey === targetKey) {
        const moves = [];
        let key = targetKey;
        while (key !== startKey) {
          const parent = parents.get(key);
          moves.push(parent.move);
          key = parent.previousKey;
        }
        return moves.reverse();
      }
      queue.push(next);
    }
  }
  throw new Error(`Sliding puzzle has no solution: ${startKey} -> ${targetKey}`);
}

async function solvePasswordEvidence(miniProgram) {
  await callActiveComponent(miniProgram, 'onSelectEvidence', eventDataset({ clue: 'vine' }));
  for (const index of [0, 2, 4, 5, 7]) {
    await callActiveComponent(miniProgram, 'onToggleEvidence', eventDataset({ clue: 'vine', index }));
  }
  await callActiveComponent(miniProgram, 'onSelectEvidence', eventDataset({ clue: 'holes' }));
  for (const index of [0, 2, 3, 5, 6, 7]) {
    await callActiveComponent(miniProgram, 'onToggleEvidence', eventDataset({ clue: 'holes', index }));
  }
  await callActiveComponent(miniProgram, 'onSelectEvidence', eventDataset({ clue: 'overlay' }));
  for (let turn = 0; turn < 3; turn += 1) {
    await callActiveComponent(miniProgram, 'onRotateOverlay');
    const state = await appState(miniProgram);
    const overlay = state.data.game.clues.find((clue) => clue.id === 'overlay');
    assert(overlay.alignmentCount === turn + 1, `Expected overlay alignment ${turn + 1}/3, got ${overlay.alignmentCount}/3`);
  }
}

async function verifyHomepageAndPlayground(miniProgram) {
  step('homepage load');
  await routeTo(miniProgram, '/pages/zodiac/index/index');
  let state = await appState(miniProgram);
  assert(state.data.route && state.data.route.routeId === routeId, 'Homepage route failed to load');
  assert(state.data.stageCards.length === 8, `Expected 8 stage cards, got ${state.data.stageCards.length}`);
  assert(state.data.enableDevPlayground === true, 'Dev playground should be enabled in dev config');

  step('dev playground route');
  await routeTo(miniProgram, '/pages/zodiac/dev-playground/index');
  state = await waitForRoute(miniProgram, 'pages/zodiac/dev-playground/index');
  assert(state.data.stages.length === 8, `Expected 8 playground stages, got ${state.data.stages.length}`);

  step('playground rain interaction');
  await callPage(miniProgram, 'selectStage', eventDataset({ stageId: 'p2' }));
  state = await appState(miniProgram);
  assert(state.data.gameType === 'rain', `Expected rain playground, got ${state.data.gameType}`);
  await callActiveComponent(miniProgram, 'onStartToggle');
  await callActiveComponent(miniProgram, 'clearTimers');
  await callActiveComponent(miniProgram, 'spawnDrop');
  const rainVisual = await activeComponentData(miniProgram);
  assert(rainVisual && rainVisual.running === true && rainVisual.activeDrop === true, 'Rain component should generate a live random drop');
  await callActiveComponent(miniProgram, 'resolveDrop');
  state = await appState(miniProgram);
  assert(state.data.game.round >= 1, `Expected autonomous rain round, got ${state.data.game.round}`);
  await callPage(miniProgram, 'resetGame');
  const resetRainVisual = await activeComponentData(miniProgram);
  assert(resetRainVisual && resetRainVisual.running === false && resetRainVisual.activeDrop === false, 'Resetting rain must stop active timers and drops');
  await callPage(miniProgram, 'resolveRain', eventDetail({ lane: 2, type: 'good', hit: true, shifted: false }));
  state = await appState(miniProgram);
  assert(state.data.game.caught === 1, `Expected caught rain count 1, got ${state.data.game.caught}`);
  assert(state.data.game.score === 50, `Expected first rain catch to score 50, got ${state.data.game.score}`);
  assert(state.data.game.targetScore === 300, `Expected rain target 300, got ${state.data.game.targetScore}`);
  await callPage(miniProgram, 'resolveRain', eventDetail({ lane: 2, type: 'good', hit: true, shifted: false }));
  state = await appState(miniProgram);
  assert(state.data.game.score === 110 && state.data.game.combo === 2, `Expected two-catch combo score 110, got score=${state.data.game.score} combo=${state.data.game.combo}`);
  await callPage(miniProgram, 'resolveRain', eventDetail({ lane: 2, type: 'bad', hit: true, shifted: false }));
  state = await appState(miniProgram);
  assert(state.data.game.score === 110 && state.data.game.combo === 0, `Bad hit must preserve score and reset combo, got score=${state.data.game.score} combo=${state.data.game.combo}`);
  await callPage(miniProgram, 'resolveRain', eventDetail({ lane: 2, type: 'good', hit: true, shifted: false }));
  state = await appState(miniProgram);
  assert(state.data.game.score === 160 && state.data.game.combo === 1, `Post-break catch must restart at base points, got score=${state.data.game.score} combo=${state.data.game.combo}`);

  step('playground password result output');
  await callPage(miniProgram, 'selectStage', eventDataset({ stageId: 'p5' }));
  await solvePasswordEvidence(miniProgram);
  await callPage(miniProgram, 'checkPassword');
  state = await appState(miniProgram);
  assert(state.data.resultText.includes('"status": "completed"'), 'Playground should output completed StageResult');
  assert(state.data.eventText.includes('password:rotateoverlay'), 'Playground should log password evidence events');
}

async function startRealRoute(miniProgram) {
  await resetZodiacStorage(miniProgram);
  await routeTo(miniProgram, `/pages/zodiac/stage/index?routeId=${routeId}&stageId=p1`);
  await waitForRoute(miniProgram, 'pages/zodiac/stage/index');
  await waitForStage(miniProgram, 'p1');
}

async function completeDashuifa(miniProgram) {
  step('real p1 dashuifa');
  let state = await appState(miniProgram);
  const initial = state.data.game.order.slice();
  const target = state.data.game.target.slice();
  const blankIndex = initial.indexOf(0);
  const invalidIndex = initial.findIndex((value, index) => value !== 0 && !areGridNeighbors(index, blankIndex));
  await callActiveComponent(miniProgram, 'onTileTap', eventDataset({ index: invalidIndex }));
  state = await appState(miniProgram);
  assert(state.data.game.invalidMoves === 1, `Expected one blocked puzzle move, got ${state.data.game.invalidMoves}`);
  assert(state.data.game.order.join(',') === initial.join(','), 'Blocked puzzle move must not change tile order');

  const moves = solveSlidingPuzzle(initial, target);
  assert(moves.length > 0, 'Expected a non-empty sliding puzzle solution');
  for (const index of moves) {
    await callActiveComponent(miniProgram, 'onTileTap', eventDataset({ index }));
  }
  await waitForStage(miniProgram, 'p2');
}

async function completeRain(miniProgram) {
  step('real p2 rain');
  let state = await appState(miniProgram);
  for (let caught = 0; caught < 10 && state.data.game.score < state.data.game.targetScore; caught += 1) {
    await callPage(miniProgram, 'resolveRain', eventDetail({ lane: caught % 5, type: 'good', hit: true, shifted: false }));
    state = await appState(miniProgram);
  }
  assert(state.data.game.score >= state.data.game.targetScore, `Expected at least ${state.data.game.targetScore} rain points, got ${state.data.game.score}`);
  await waitForStage(miniProgram, 'p3');
}

async function completeEnvelope(miniProgram) {
  step('real p3 envelope');
  let state = await appState(miniProgram);
  assert(state.data.game.slots.length === 3, `Expected 3 envelope slots, got ${state.data.game.slots.length}`);
  assert(state.data.game.pieces.length === 6, `Expected 6 envelope pieces, got ${state.data.game.pieces.length}`);
  assert(state.data.game.slots.map((slot) => slot.lowerChar).join('') === '海晏堂', 'Envelope lower halves must spell 海晏堂');
  const pieceIndexes = state.data.game.slots.map((_, slotIndex) => state.data.game.pieces.findIndex((piece) => piece.targetIndex === slotIndex));
  assert(pieceIndexes.every((index) => index >= 0), `Missing envelope answer pieces: ${pieceIndexes.join(',')}`);
  assert(pieceIndexes.map((index) => state.data.game.pieces[index].char).join('') === '海晏堂', 'Envelope answer pieces must independently spell 海晏堂');

  await callActiveComponent(miniProgram, 'onPickPiece', eventDataset({ index: pieceIndexes[0] }));
  await callActiveComponent(miniProgram, 'onRemovePiece', eventDataset({ index: 0 }));
  state = await appState(miniProgram);
  assert(state.data.game.slots[0].pieceId === '', 'Removed envelope piece should clear its slot');
  assert(state.data.game.pieces[pieceIndexes[0]].used === false, 'Removed envelope piece should become reusable');
  for (const index of pieceIndexes) {
    await callActiveComponent(miniProgram, 'onPickPiece', eventDataset({ index }));
  }
  state = await appState(miniProgram);
  assert(state.data.game.slots.every((slot) => slot.pieceId), 'All envelope slots should contain an upper-half piece');
  await callActiveComponent(miniProgram, 'onCheck');
  await waitForStage(miniProgram, 'p4');
}

async function completeClock(miniProgram) {
  step('real p4 clock');
  const state = await appState(miniProgram);
  assert(state.data.game.heads.length === 12, `Expected 12 clock heads, got ${state.data.game.heads.length}`);
  assert(state.data.game.branches.length === 12, `Expected 12 clock branches, got ${state.data.game.branches.length}`);
  assert(Object.entries(canonicalClock).every(([head, branch]) => state.data.game.answer[head] === branch), 'Clock answer must match the canonical twelve earthly branches');
  for (let headIndex = 0; headIndex < state.data.game.heads.length; headIndex += 1) {
    const head = state.data.game.heads[headIndex].label;
    const branchIndex = state.data.game.branches.findIndex((branch) => branch.label === state.data.game.answer[head]);
    assert(branchIndex >= 0, `Missing branch answer for ${head}`);
    await callActiveComponent(miniProgram, 'onSelectHead', eventDataset({ index: headIndex }));
    await callActiveComponent(miniProgram, 'onSelectBranch', eventDataset({ index: branchIndex }));
  }
  await waitForStage(miniProgram, 'p5');
}

async function completePassword(miniProgram) {
  step('real p5 password');
  await solvePasswordEvidence(miniProgram);
  await callPage(miniProgram, 'checkPassword');
  await waitForStage(miniProgram, 'p6');
}

async function completeOrder(miniProgram) {
  step('real p6 order');
  let state = await appState(miniProgram);
  assert(state.data.game.answer.length === 12, `Expected 12 sandtable answers, got ${state.data.game.answer.length}`);
  assert(state.data.game.branches.length === 12, `Expected 12 sandtable branches, got ${state.data.game.branches.length}`);
  assert(state.data.game.answer.join(',') === canonicalZodiacOrder.join(','), 'Sandtable answer must use canonical zodiac order');
  const cardIndexes = state.data.game.answer.map((label) => state.data.game.cards.findIndex((card) => card.label === label));
  assert(cardIndexes.every((index) => index >= 0), `Missing sandtable cards: ${cardIndexes.join(',')}`);

  await callActiveComponent(miniProgram, 'onPickCard', eventDataset({ index: cardIndexes[0] }));
  await callActiveComponent(miniProgram, 'onRemoveCard', eventDataset({ index: 0 }));
  state = await appState(miniProgram);
  assert(state.data.game.picked.length === 0, 'Removed sandtable card should leave the slot');
  assert(state.data.game.cards[cardIndexes[0]].used === false, 'Removed sandtable card should become reusable');
  for (const index of cardIndexes) {
    await callActiveComponent(miniProgram, 'onPickCard', eventDataset({ index }));
  }
  state = await appState(miniProgram);
  const expectedText = state.data.game.answer.join(' → ');
  assert(state.data.pickedText === expectedText, `pickedText not updated: ${state.data.pickedText}`);
  await callActiveComponent(miniProgram, 'onCheck');
  await waitForStage(miniProgram, 'p7');
}

async function completeMaze(miniProgram) {
  step('real p7 maze');
  await callPage(miniProgram, 'rotateMaze', eventDetail({ index: 2 }));
  let state = await appState(miniProgram);
  assert(state.data.game.modules[2].rotation === 90, 'Third maze module should reach its target angle');
  assert(state.data.game.connectedCount === 0, 'Later maze modules must not light before the entrance connects');
  for (let index = 0; index < state.data.game.rotations.length; index += 1) {
    const turns = ((state.data.game.target[index] - state.data.game.rotations[index] + 360) % 360) / 90;
    for (let turn = 0; turn < turns; turn += 1) {
      await callPage(miniProgram, 'rotateMaze', eventDetail({ index }));
    }
  }
  state = await appState(miniProgram);
  for (let index = 0; index < state.data.game.modules.length; index += 1) {
    if (state.data.game.modules[index].shape !== 'straight') continue;
    await callPage(miniProgram, 'rotateMaze', eventDetail({ index }));
    await callPage(miniProgram, 'rotateMaze', eventDetail({ index }));
  }
  state = await appState(miniProgram);
  assert(state.data.game.connectedCount === state.data.game.target.length, 'Straight roads rotated 180 degrees must remain connected');
  assert(state.data.game.rotations.some((rotation, index) => rotation !== state.data.game.target[index]), 'Equivalent maze test must differ from raw target rotations');
  await callPage(miniProgram, 'checkMaze');
  state = await appState(miniProgram);
  assert(state.data.stage.stageId === 'p7', 'Maze path alone must not complete p7');
  assert(state.data.game.phase === 'timeline', `Expected timeline phase, got ${state.data.game.phase}`);
  assert(state.data.game.timelineAnswer.length === 5, `Expected 5 timeline answers, got ${state.data.game.timelineAnswer.length}`);
  assert(state.data.game.timelineAnswer.join(',') === canonicalTimelineAnswer.join(','), 'Timeline answer must follow canonical return chronology');
  assert(Object.entries(canonicalTimelineYears).every(([id, year]) => {
    const event = state.data.game.timelineEvents.find((item) => item.id === id);
    return event && event.year === year;
  }), 'Timeline cards must display the canonical return years');

  const wrongIndex = state.data.game.timelineEvents.findIndex((event) => event.id === state.data.game.timelineAnswer[1]);
  await callActiveComponent(miniProgram, 'onPickTimeline', eventDataset({ index: wrongIndex }));
  await callActiveComponent(miniProgram, 'onRemoveTimeline', eventDataset({ index: 0 }));
  state = await appState(miniProgram);
  assert(state.data.game.timelinePicked.length === 0, 'Removed timeline event should leave the first slot');
  assert(state.data.game.timelineEvents[wrongIndex].used === false, 'Removed timeline event should become reusable');

  for (const eventId of state.data.game.timelineAnswer) {
    const index = state.data.game.timelineEvents.findIndex((event) => event.id === eventId);
    assert(index >= 0, `Missing timeline event ${eventId}`);
    await callActiveComponent(miniProgram, 'onPickTimeline', eventDataset({ index }));
  }
  state = await appState(miniProgram);
  assert(state.data.game.timelinePicked.join(',') === state.data.game.timelineAnswer.join(','), 'Timeline should match configured answer before confirmation');
  await callActiveComponent(miniProgram, 'onCheckTimeline');
  await waitForStage(miniProgram, 'p8', 10000);
}

async function completeFinal(miniProgram) {
  step('real p8 final');
  let state = await waitForStage(miniProgram, 'p8');
  assert(state.data.game.availableMarks.length === 8, `Expected 8 final marks, got ${state.data.game.availableMarks.length}`);
  assert(state.data.game.missingRequiredCount === 0, `Expected 0 missing marks, got ${state.data.game.missingRequiredCount}`);
  await callPage(miniProgram, 'confirmHorse');
  state = await appState(miniProgram);
  const marks = state.data.game.availableMarks;
  const firstMark = marks[0];
  const wrongSlot = state.data.game.slots.find((slot) => slot.zodiac !== firstMark.zodiac);
  await callPage(miniProgram, 'selectFinalMark', eventDetail({ zodiac: firstMark.zodiac }));
  await callPage(miniProgram, 'placeFinalSlot', eventDetail({ zodiac: wrongSlot.zodiac }));
  state = await appState(miniProgram);
  assert(state.data.game.attempts === 1, `Expected one rejected final placement, got ${state.data.game.attempts}`);
  assert(state.data.game.availableMarks.find((mark) => mark.zodiac === firstMark.zodiac).placed === false, 'Wrong time slot must not place a mark');
  for (const mark of marks) {
    await callPage(miniProgram, 'selectFinalMark', eventDetail({ zodiac: mark.zodiac }));
    await callPage(miniProgram, 'placeFinalSlot', eventDetail({ zodiac: mark.zodiac }));
  }
  state = await appState(miniProgram);
  assert(state.data.game.solved === true, 'Final board should be solved before completion');
  await callPage(miniProgram, 'completeFinalStage');
  const records = await waitForRecords(miniProgram);
  assert(Array.isArray(records) && records.length > 0, 'Expected generated record');
  assert(records[0].status === 'completed', `Expected completed record, got ${records[0] && records[0].status}`);
  assert(records[0].completedStageCount === 8, `Expected 8 completed stages, got ${records[0].completedStageCount}`);
}

(async () => {
  bootDevTools();
  step(`connect automator ws://127.0.0.1:${autoPort}`);
  const miniProgram = await connectAutomator();
  const startupMessageCount = await clearDevToolsStartupNoise(miniProgram);
  console.log(`[sim-service] cleared ${startupMessageCount} DevTools startup console messages`);
  const runtimeErrors = [];
  miniProgram.on('console', (entry) => {
    if (entry.type === 'error') runtimeErrors.push(`[${activeStep}] console: ${entry.args.map(formatConsoleArg).join(' ')}`);
  });
  miniProgram.on('exception', (entry) => {
    runtimeErrors.push(`[${activeStep}] exception: ${formatConsoleArg(entry)}`);
  });
  try {
    await verifyUiPrototype(miniProgram);
    await verifyHomepageAndPlayground(miniProgram);
    await startRealRoute(miniProgram);
    await completeDashuifa(miniProgram);
    await completeRain(miniProgram);
    await completeEnvelope(miniProgram);
    await completeClock(miniProgram);
    await completePassword(miniProgram);
    await completeOrder(miniProgram);
    await completeMaze(miniProgram);
    await completeFinal(miniProgram);
    await sleep(300);
    assert(runtimeErrors.length === 0, `Runtime errors detected:\n${runtimeErrors.join('\n')}`);
    console.log('SIMULATOR_APP_SERVICE_CHECK_PASSED');
  } finally {
    miniProgram.disconnect();
  }
})().catch((error) => {
  console.error('SIMULATOR_APP_SERVICE_CHECK_FAILED');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
