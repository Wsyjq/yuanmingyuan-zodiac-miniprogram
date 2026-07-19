Component({
  properties: {
    game: { type: Object, value: {} }
  },
  methods: {
    onConfirmHorse() {
      this.triggerEvent('confirmhorse');
    },
    onSelectMark(event) {
      this.triggerEvent('selectmark', {
        zodiac: event.currentTarget.dataset.zodiac
      });
    },
    onPlaceSlot(event) {
      this.triggerEvent('placeslot', {
        zodiac: event.currentTarget.dataset.zodiac
      });
    },
    onCompleteFinal() {
      this.triggerEvent('completefinal');
    }
  }
});
