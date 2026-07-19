const tourService = require('../../../services/tour-service');
const userService = require('../../../services/user-service');
const { formatDateTime } = require('../../../utils/time');

const routeId = 'zodiac-return';

Page({
  data: {
    route: null,
    user: null,
    session: null,
    hasSession: false,
    progressText: '0/8',
    progressPercent: 0,
    stageCards: [],
    markChips: [],
    enableDevPlayground: false
  },

  onLoad() {
    this.refresh();
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const app = getApp();
    const bootstrap = tourService.getBootstrap(routeId);
    const route = bootstrap.route;
    const session = tourService.getCurrentSession(routeId);
    const user = userService.getProfile();
    const progress = tourService.buildProgress(route, session);
    const progressPercent = Math.round((progress.completedCount / progress.totalCount) * 100);

    const stageCards = progress.stages.map((stage) => ({
      ...stage,
      statusText: this.getStageStatusText(stage)
    }));

    this.setData({
      route,
      user,
      session,
      hasSession: Boolean(session),
      progressText: `${progress.completedCount}/${progress.totalCount}`,
      progressPercent,
      stageCards,
      markChips: this.createMarkChips(route, progress.marks),
      enableDevPlayground: Boolean(app.globalData.enableDevPlayground)
    });
  },

  createMarkChips(route, collectedMarks) {
    const collected = new Set(collectedMarks || []);
    const tracking = new Set(route.finalRule.tracking);
    const missing = new Set(route.finalRule.missing);
    const order = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
    return order.map((zodiac) => ({
      zodiac,
      collected: collected.has(zodiac),
      tracking: tracking.has(zodiac),
      missing: missing.has(zodiac),
      label: collected.has(zodiac) ? (tracking.has(zodiac) ? '追索' : '已获') : missing.has(zodiac) ? '空缺' : '待寻'
    }));
  },

  getStageStatusText(stage) {
    if (stage.progressStatus === 'completed') return `已完成 · ${stage.mark.zodiac}首`;
    if (stage.progressStatus === 'skipped') return `已跳过 · ${stage.markCollected ? `${stage.mark.zodiac}首` : '未获印记'}`;
    if (stage.progressStatus === 'in_progress') return '进行中';
    return '未开始';
  },

  startTour() {
    const session = tourService.startSession(routeId, { forceNew: true });
    this.goStage(session.currentStageId);
  },

  continueTour() {
    const session = tourService.getCurrentSession(routeId);
    if (!session) {
      wx.showToast({ title: '暂无进行中进度', icon: 'none' });
      this.refresh();
      return;
    }
    this.goStage(session.currentStageId);
  },

  restartTour() {
    wx.showModal({
      title: '重新开始',
      content: '将保留旧记录为已放弃，并创建一条新的游玩进度。',
      confirmText: '重新开始',
      success: (res) => {
        if (!res.confirm) return;
        const session = tourService.startSession(routeId, { restart: true, forceNew: true });
        this.goStage(session.currentStageId);
      }
    });
  },

  tapStage(event) {
    const stageId = event.detail && event.detail.stageId ? event.detail.stageId : event.currentTarget.dataset.stageId;
    let session = tourService.getCurrentSession(routeId);
    if (!session) session = tourService.startSession(routeId, { forceNew: true });
    this.goStage(stageId || session.currentStageId);
  },

  openMap() {
    wx.navigateTo({ url: '/pages/zodiac/map/index' });
  },

  openRecords() {
    wx.navigateTo({ url: '/pages/zodiac/records/index' });
  },

  openDevPlayground() {
    wx.navigateTo({ url: '/pages/zodiac/dev-playground/index' });
  },

  clearLocalData() {
    wx.showModal({
      title: '清空本地 Mock',
      content: '仅用于开发调试，会清空本地进度和记录。',
      confirmText: '清空',
      success: (res) => {
        if (!res.confirm) return;
        tourService.resetLocal(routeId);
        this.refresh();
        wx.showToast({ title: '已清空', icon: 'success' });
      }
    });
  },

  goStage(stageId) {
    wx.navigateTo({
      url: `/pages/zodiac/stage/index?routeId=${routeId}&stageId=${stageId}`
    });
  },

  formatDateTime
});
