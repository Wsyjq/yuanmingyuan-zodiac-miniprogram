Component({
  options: {
    multipleSlots: true
  },
  properties: {
    stage: { type: Object, value: null },
    progressText: { type: String, value: '0/8' },
    progressPercent: { type: Number, value: 0 },
    markChips: { type: Array, value: [] }
  }
});
