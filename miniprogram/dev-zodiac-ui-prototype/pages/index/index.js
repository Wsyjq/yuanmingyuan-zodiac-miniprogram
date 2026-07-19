const {
  SCREEN_IDS,
  SCREEN_OPTIONS,
  PREVIEW_OPTIONS,
  DEFAULT_PREVIEW,
  VISUAL_TOKENS,
  SCREENS_BY_ID
} = require('../../mock/screens');

const OPTION_VALUES = {
  motion: PREVIEW_OPTIONS.motion.map((item) => item.value),
  network: PREVIEW_OPTIONS.network.map((item) => item.value),
  reachability: PREVIEW_OPTIONS.reachability.map((item) => item.value)
};

let assetGenerationSequence = 0;

function nextAssetGeneration() {
  assetGenerationSequence += 1;
  return `asset-generation-${assetGenerationSequence}`;
}

function isDevelopmentRuntime() {
  try {
    const account = wx.getAccountInfoSync();
    return Boolean(account && account.miniProgram && account.miniProgram.envVersion === 'develop');
  } catch (error) {
    return false;
  }
}

function normalizeValue(value, allowed, fallback, key, warnings) {
  if (typeof value !== 'string' || value === '') return fallback;
  if (allowed.indexOf(value) >= 0) return value;
  warnings.push(`${key}=${value}`);
  return fallback;
}

function normalizeOptions(options) {
  const source = options || {};
  const warnings = [];
  return {
    screen: normalizeValue(source.screen, SCREEN_IDS, DEFAULT_PREVIEW.screen, 'screen', warnings),
    motion: normalizeValue(source.motion, OPTION_VALUES.motion, DEFAULT_PREVIEW.motion, 'motion', warnings),
    network: normalizeValue(source.network, OPTION_VALUES.network, DEFAULT_PREVIEW.network, 'network', warnings),
    reachability: normalizeValue(source.reachability, OPTION_VALUES.reachability, DEFAULT_PREVIEW.reachability, 'reachability', warnings),
    warning: warnings.length ? `已忽略无效参数：${warnings.join('，')}` : ''
  };
}

function readWindowBaseline(size) {
  let info = {};
  try {
    if (typeof wx.getWindowInfo === 'function') info = wx.getWindowInfo();
    else if (typeof wx.getSystemInfoSync === 'function') info = wx.getSystemInfoSync();
  } catch (error) {
    info = {};
  }
  const override = size || {};
  const width = Number(override.windowWidth || info.windowWidth || 0);
  const height = Number(override.windowHeight || info.windowHeight || 0);
  const safeArea = info.safeArea || {};
  return {
    width,
    height,
    orientation: width > height ? 'landscape' : 'portrait',
    orientationLabel: width > height ? '横屏' : '竖屏',
    pixelRatio: Number(info.pixelRatio || 1),
    safeLeft: Number(safeArea.left || 0),
    safeTop: Number(safeArea.top || 0),
    safeRight: Math.max(0, width - Number(safeArea.right || width)),
    safeBottom: Math.max(0, height - Number(safeArea.bottom || height))
  };
}

function datasetValue(event, key) {
  const dataset = event && event.currentTarget && event.currentTarget.dataset;
  return dataset && typeof dataset[key] === 'string' ? dataset[key] : '';
}

function assetIdsForScreen(screen) {
  return screen && Array.isArray(screen.assets) ? screen.assets.map((asset) => asset.id) : [];
}

Page({
  data: {
    screenOptions: SCREEN_OPTIONS,
    motionOptions: PREVIEW_OPTIONS.motion,
    networkOptions: PREVIEW_OPTIONS.network,
    reachabilityOptions: PREVIEW_OPTIONS.reachability,
    visualTokens: VISUAL_TOKENS,
    activeScreenId: DEFAULT_PREVIEW.screen,
    screen: SCREENS_BY_ID[DEFAULT_PREVIEW.screen],
    motionMode: DEFAULT_PREVIEW.motion,
    networkMode: DEFAULT_PREVIEW.network,
    reachabilityMode: DEFAULT_PREVIEW.reachability,
    viewport: readWindowBaseline(),
    queryWarning: '',
    previewNotice: '',
    prototypeReady: false,
    assetGeneration: nextAssetGeneration(),
    loadedAssetIds: [],
    failedAssetIds: [],
    assetFailureMessage: ''
  },

  onLoad(options) {
    if (!isDevelopmentRuntime()) {
      wx.reLaunch({ url: '/pages/zodiac/index/index' });
      return;
    }
    const preview = normalizeOptions(options);
    this.setData({
      activeScreenId: preview.screen,
      screen: SCREENS_BY_ID[preview.screen],
      motionMode: preview.motion,
      networkMode: preview.network,
      reachabilityMode: preview.reachability,
      viewport: readWindowBaseline(),
      queryWarning: preview.warning,
      previewNotice: '',
      prototypeReady: true,
      assetGeneration: nextAssetGeneration(),
      loadedAssetIds: [],
      failedAssetIds: [],
      assetFailureMessage: ''
    });
  },

  onResize(event) {
    this.setData({ viewport: readWindowBaseline(event && event.size) });
  },

  onSelectScreen(event) {
    const screenId = datasetValue(event, 'screenId');
    if (SCREEN_IDS.indexOf(screenId) < 0 || screenId === this.data.activeScreenId) return;
    this.setData({
      activeScreenId: screenId,
      screen: SCREENS_BY_ID[screenId],
      queryWarning: '',
      previewNotice: '',
      assetGeneration: nextAssetGeneration(),
      loadedAssetIds: [],
      failedAssetIds: [],
      assetFailureMessage: ''
    });
  },

  onSelectMotion(event) {
    this.setPreviewMode('motionMode', datasetValue(event, 'value'), OPTION_VALUES.motion);
  },

  onSelectNetwork(event) {
    this.setPreviewMode('networkMode', datasetValue(event, 'value'), OPTION_VALUES.network);
  },

  onSelectReachability(event) {
    this.setPreviewMode('reachabilityMode', datasetValue(event, 'value'), OPTION_VALUES.reachability);
  },

  setPreviewMode(key, value, allowed) {
    if (allowed.indexOf(value) < 0 || value === this.data[key]) return;
    const assetState = key === 'reachabilityMode'
      ? {
          assetGeneration: nextAssetGeneration(),
          loadedAssetIds: [],
          failedAssetIds: [],
          assetFailureMessage: ''
        }
      : {};
    this.setData({ [key]: value, queryWarning: '', ...assetState });
  },

  onPreviewUtility(event) {
    const utility = datasetValue(event, 'utility');
    const label = utility === 'toolkit' ? '工具包' : utility === 'map' ? '路线地图' : '';
    if (!label) return;
    this.setData({ previewNotice: `原型只读：${label}入口尚未执行。` });
  },

  onProductAction() {
    this.setData({ previewNotice: `原型只读：未执行“${this.data.screen.primaryActionLabel}”。` });
  },

  onAssetLoad(event) {
    this.updateAssetLoadState(datasetValue(event, 'assetId'), datasetValue(event, 'assetGeneration'), false);
  },

  onAssetError(event) {
    this.updateAssetLoadState(datasetValue(event, 'assetId'), datasetValue(event, 'assetGeneration'), true);
  },

  updateAssetLoadState(assetId, assetGeneration, failed) {
    if (!assetId || assetGeneration !== this.data.assetGeneration || assetIdsForScreen(this.data.screen).indexOf(assetId) < 0) return;
    const loadedAssetIds = this.data.loadedAssetIds.filter((id) => id !== assetId);
    const failedAssetIds = this.data.failedAssetIds.filter((id) => id !== assetId);
    if (failed) failedAssetIds.push(assetId);
    else loadedAssetIds.push(assetId);
    this.setData({
      loadedAssetIds,
      failedAssetIds,
      assetFailureMessage: failedAssetIds.length
        ? '已保留标题、来源边界和操作层；请检查独立分包内的本地 SVG 文件。'
        : ''
    });
  },

  onResetPreview() {
    const resetAssetState = this.data.activeScreenId !== DEFAULT_PREVIEW.screen
      || this.data.reachabilityMode !== DEFAULT_PREVIEW.reachability;
    this.setData({
      activeScreenId: DEFAULT_PREVIEW.screen,
      screen: SCREENS_BY_ID[DEFAULT_PREVIEW.screen],
      motionMode: DEFAULT_PREVIEW.motion,
      networkMode: DEFAULT_PREVIEW.network,
      reachabilityMode: DEFAULT_PREVIEW.reachability,
      queryWarning: '',
      previewNotice: '',
      assetGeneration: resetAssetState ? nextAssetGeneration() : this.data.assetGeneration,
      loadedAssetIds: resetAssetState ? [] : this.data.loadedAssetIds,
      failedAssetIds: resetAssetState ? [] : this.data.failedAssetIds,
      assetFailureMessage: resetAssetState ? '' : this.data.assetFailureMessage
    });
  }
});
