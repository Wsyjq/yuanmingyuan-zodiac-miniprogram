Component({
  properties: {
    game: { type: Object, value: {} },
    pickedText: { type: String, value: '' }
  },
  methods: {
    onPickCard(event) {
      this.triggerEvent('pickcard', {
        index: Number(event.currentTarget.dataset.index)
      });
    },
    onRemoveCard(event) {
      this.triggerEvent('removecard', {
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
