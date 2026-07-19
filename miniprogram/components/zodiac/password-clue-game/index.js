Component({
  properties: {
    game: { type: Object, value: {} }
  },
  data: {
    gridCells: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    anchorDots: [1, 2, 3]
  },
  methods: {
    onSelectEvidence(event) {
      this.triggerEvent('selectevidence', {
        clue: event.currentTarget.dataset.clue
      });
    },
    onToggleEvidence(event) {
      this.triggerEvent('toggleevidence', {
        clue: event.currentTarget.dataset.clue,
        index: Number(event.currentTarget.dataset.index)
      });
    },
    onRotateOverlay() {
      this.triggerEvent('rotateoverlay');
    },
    onCheck() {
      this.triggerEvent('check');
    }
  }
});
