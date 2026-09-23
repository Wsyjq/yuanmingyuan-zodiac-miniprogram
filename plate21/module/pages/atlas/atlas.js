const session = require('../../store/session')
const mainline = require('../../capabilities/map/sites-mainline')

Page({
  data: {
    sites: [],
    markers: [],
    polyline: [],
    center: { latitude: 40.0067, longitude: 116.3092 }
  },

  onShow() {
    const load = session.getSnapshot() ? Promise.resolve() : session.init({})
    load.then(() => {
      const sites = mainline.visitState(session.getSnapshot())
      this.setData({
        sites: sites,
        markers: mainline.SITES.map(function (site, index) {
          return {
            id: index + 1,
            latitude: site.latitude,
            longitude: site.longitude,
            width: 28,
            height: 28,
            iconPath: '/plate21/module/assets/img/icons/ic-map-pin-brass.png',
            callout: { content: site.name, display: 'BYCLICK', padding: 4, fontSize: 12 }
          }
        }),
        polyline: [{
          points: mainline.SITES.map(function (site) {
            return { latitude: site.latitude, longitude: site.longitude }
          }),
          color: '#8C6239',
          width: 4,
          dottedLine: true
        }]
      })
    })
  },

  onOpen(e) {
    const site = (this.data.sites || []).filter(function (row) {
      return row.id === e.currentTarget.dataset.id
    })[0]
    if (!site || !site.opened || !site.page) return
    wx.navigateTo({ url: site.page })
  }
})
