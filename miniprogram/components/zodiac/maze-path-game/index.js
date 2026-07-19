Component({
  properties: {
    game: { type: Object, value: {} }
  },
  methods: {
    onRotate(event) {
      this.triggerEvent('rotate', {
        index: Number(event.currentTarget.dataset.index)
      });
    },
    onCheck() {
      this.triggerEvent('check');
    },
    onPickTimeline(event) {
      this.triggerEvent('picktimeline', {
        index: Number(event.currentTarget.dataset.index)
      });
    },
    onRemoveTimeline(event) {
      this.triggerEvent('removetimeline', {
        index: Number(event.currentTarget.dataset.index)
      });
    },
    onClearTimeline() {
      this.triggerEvent('cleartimeline');
    },
    onCheckTimeline() {
      this.triggerEvent('checktimeline');
    }
  }
});
