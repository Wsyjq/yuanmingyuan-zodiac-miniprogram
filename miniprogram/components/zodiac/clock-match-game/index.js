Component({
  properties: {
    game: { type: Object, value: {} }
  },
  methods: {
    onSelectHead(event) {
      this.triggerEvent('selecthead', {
        index: Number(event.currentTarget.dataset.index)
      });
    },
    onSelectBranch(event) {
      this.triggerEvent('selectbranch', {
        index: Number(event.currentTarget.dataset.index)
      });
    }
  }
});
