const tourService = require('../../../services/tour-service');
const { formatDateTime } = require('../../../utils/time');

Page({
  data: {
    record: null,
    stages: []
  },

  onLoad(options) {
    const record = tourService.getRecordDetail(options.recordId);
    if (!record) return;
    const route = tourService.getRoute(record.routeId);
    const stageMap = {};
    record.stages.forEach((stageProgress) => {
      stageMap[stageProgress.stageId] = stageProgress;
    });
    const stages = route.stages.map((stage) => {
      const progress = stageMap[stage.stageId];
      return {
        ...stage,
        statusText: progress ? (progress.status === 'completed' ? '已完成' : '已跳过') : '未完成',
        completedText: progress ? formatDateTime(progress.completedAt) : '-',
        markText: progress && progress.mark ? `${progress.mark}首` : '未获印记'
      };
    });
    this.setData({
      record: {
        ...record,
        startedText: formatDateTime(record.startedAt),
        endedText: formatDateTime(record.endedAt),
        statusText: record.status === 'completed' ? '已完成' : '已放弃'
      },
      stages
    });
  }
});
