const tourService = require('../../../services/tour-service');
const { formatDateTime } = require('../../../utils/time');

const routeId = 'zodiac-return';

Page({
  data: {
    records: []
  },

  onShow() {
    const records = tourService.getRecords(routeId).map((record) => ({
      ...record,
      startedText: formatDateTime(record.startedAt),
      endedText: formatDateTime(record.endedAt),
      statusText: record.status === 'completed' ? '已完成' : '已放弃'
    }));
    this.setData({ records });
  },

  openRecord(event) {
    const recordId = event.currentTarget.dataset.recordId;
    wx.navigateTo({ url: `/pages/zodiac/record-detail/index?recordId=${recordId}` });
  }
});
