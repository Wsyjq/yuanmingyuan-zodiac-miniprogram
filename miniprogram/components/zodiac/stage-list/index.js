Component({
  properties: {
    stages: { type: Array, value: [] },
    title: { type: String, value: '八站路线' }
  },
  methods: {
    onStageTap(event) {
      this.triggerEvent('stagetap', {
        stageId: event.currentTarget.dataset.stageId
      });
    }
  }
});
