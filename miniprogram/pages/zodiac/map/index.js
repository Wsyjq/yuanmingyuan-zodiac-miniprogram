const tourService = require('../../../services/tour-service');

const routeId = 'zodiac-return';

Page({
  data: {
    center: { latitude: 40.0115, longitude: 116.3071 },
    markers: [],
    polyline: [],
    selectedStage: null,
    hasUserLocation: false,
    userLocationText: '暂未获取当前位置'
  },

  onLoad() {
    const bootstrap = tourService.getBootstrap(routeId);
    this.setData({
      center: bootstrap.map.center,
      markers: bootstrap.map.markers,
      polyline: bootstrap.map.polyline
    });
  },

  locateUser() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          center: { latitude: res.latitude, longitude: res.longitude },
          hasUserLocation: true,
          userLocationText: `当前位置精度约 ${Math.round(res.accuracy || 0)} 米`
        });
      },
      fail: () => {
        wx.showToast({ title: '定位失败，可继续查看站点地图', icon: 'none' });
      }
    });
  },

  onMarkerTap(event) {
    const markerId = event.detail.markerId;
    const bootstrap = tourService.getBootstrap(routeId);
    const marker = bootstrap.map.markers.find((item) => item.id === markerId);
    if (!marker) return;
    const stage = tourService.getStage(routeId, marker.stageId);
    this.setData({ selectedStage: stage });
  },

  goStage() {
    const stage = this.data.selectedStage;
    if (!stage) return;
    let session = tourService.getCurrentSession(routeId);
    if (!session) session = tourService.startSession(routeId, { forceNew: true });
    wx.navigateTo({ url: `/pages/zodiac/stage/index?routeId=${routeId}&stageId=${stage.stageId}` });
  }
});
