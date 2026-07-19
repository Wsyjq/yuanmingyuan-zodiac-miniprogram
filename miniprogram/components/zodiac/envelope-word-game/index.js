Component({
  properties: {
    game: { type: Object, value: {} }
  },
  methods: {
    onPickPiece(event) {
      this.triggerEvent('pickpiece', {
        index: Number(event.currentTarget.dataset.index)
      });
    },
    onRemovePiece(event) {
      this.triggerEvent('removepiece', {
        index: Number(event.currentTarget.dataset.index)
      });
    },
    onClear() {
      this.triggerEvent('clear');
    },
    onCheck() {
      this.triggerEvent('check');
    }
  }
});
