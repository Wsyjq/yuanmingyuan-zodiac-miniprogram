Component({
  properties: {
    game: {
      type: Object,
      value: {
        order: [],
        tiles: []
      }
    }
  },
  methods: {
    onTileTap(event) {
      this.triggerEvent('tiletap', {
        index: Number(event.currentTarget.dataset.index)
      });
    },

    onReset() {
      this.triggerEvent('reset');
    },

    onCheck() {
      this.triggerEvent('check');
    }
  }
});
