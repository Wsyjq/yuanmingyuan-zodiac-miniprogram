/**
 * map-drawer —— 半屏实地导引抽屉（原生 <map>）。
 * 玩家当前位置蓝点 + 四站黄铜钉 + 手绘风折线 + 下一站距离 + 拉起微信导航。
 * 定位失败/拒绝时抽屉照常打开：显示降级说明与「去开启定位」入口，并记 capability_fallback。
 *
 * 用法（父组件）：<map-drawer id="mapDrawer" /> → this.selectComponent('#mapDrawer').open()
 */
const session = require('../../../store/session')
const registry = require('../../registry')
const siteGeo = require('../site-geo')
const mainline = require('../sites-mainline')

const PIN_ICON = '/plate21/module/assets/img/icons/ic-map-pin-brass.png'
const CHECKIN_RADIUS = 80 // 米；geofence 开关打开时的到场判定半径

Component({
  data: {
    open: false,
    closing: false,
    center: { longitude: siteGeo.SITES[1].longitude, latitude: siteGeo.SITES[1].latitude },
    scale: 16,
    markers: [],
    polyline: [],
    sites: [],
    nextSite: null,
    locState: 'idle', // idle | loading | ok | denied | failed
    checkinEnabled: false
  },

  lifetimes: {
    attached() {
      this.setData({
        markers: siteGeo.SITES.map(function (site, index) {
          return {
            id: index + 1,
            latitude: site.latitude,
            longitude: site.longitude,
            iconPath: PIN_ICON,
            width: 30,
            height: 30,
            anchor: { x: 0.5, y: 0.9 },
            callout: {
              content: site.name,
              color: '#46382A',
              fontSize: 12,
              bgColor: '#F7F4EC',
              borderColor: '#A98F5F',
              borderWidth: 1,
              borderRadius: 4,
              padding: 6,
              display: 'BYCLICK'
            }
          }
        }),
        polyline: [{
          points: siteGeo.SITES.map(function (site) {
            return { longitude: site.longitude, latitude: site.latitude }
          }),
          color: '#A98F5F',
          width: 4,
          dottedLine: true,
          arrowLine: true,
          borderColor: '#7A5C3E',
          borderWidth: 1
        }],
        checkinEnabled: registry.isGeofenceCheckinEnabled()
      })
    }
  },

  methods: {
    open() {
      this.setData({ open: true, closing: false })
      this.refreshSites(null)
      this.requestLocation()
      try { session.emit({ name: 'map_opened' }) } catch (e) {}
    },

    onOpenSite(e) {
      const id = e.currentTarget.dataset.id
      const site = (this.data.sites || []).filter(function (row) { return row.id === id })[0]
      if (!site || !site.opened || !site.page) return
      this.close()
      wx.navigateTo({ url: site.page })
    },

    close() {
      if (this.data.closing) return
      this.setData({ closing: true })
      setTimeout(() => {
        this.setData({ open: false, closing: false })
      }, 260)
    },

    refreshSites(userLoc) {
      const snap = session.getSnapshot()
      const next = mainline.nextSite(snap)
      const sites = mainline.visitState(snap).map(function (site) {
        const dist = userLoc ? siteGeo.distanceMeters(userLoc, site) : null
        return Object.assign({}, site, {
          done: site.opened && !site.current,
          arrived: site.current,
          distanceText: dist == null ? '' : siteGeo.formatDistance(dist)
        })
      })
      this.setData({ sites: sites, nextSite: next })
    },

    requestLocation() {
      if (this.data.locState === 'loading') return
      this.setData({ locState: 'loading' })
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          const userLoc = { latitude: res.latitude, longitude: res.longitude }
          this.setData({
            locState: 'ok',
            center: { longitude: res.longitude, latitude: res.latitude },
            scale: 17
          })
          this.refreshSites(userLoc)
          this.maybeCheckin(userLoc)
        },
        fail: (err) => {
          const msg = (err && err.errMsg) || ''
          const denied = /auth|deny|permission/i.test(msg)
          this.setData({ locState: denied ? 'denied' : 'failed' })
          this.refreshSites(null)
          try {
            session.capabilityFallback('map_location', denied ? 'user_denied' : 'getLocation_failed')
          } catch (e) {}
        }
      })
    },

    // geofence 到场打卡：默认关闭（registry 开关）。进入站点半径且未打卡时记 flag + 事件。
    maybeCheckin(userLoc) {
      if (!registry.isGeofenceCheckinEnabled()) return
      const snap = session.getSnapshot()
      const flags = (snap && snap.flags) || {}
      for (const site of siteGeo.SITES) {
        if (flags['station_arrived_' + site.station]) continue
        if (siteGeo.distanceMeters(userLoc, site) > CHECKIN_RADIUS) continue
        session.setFlag('station_arrived_' + site.station, Date.now()).catch(function () {})
        session.emit({ name: 'station_arrived', station: site.station })
        wx.showToast({ title: '你已到达' + site.name, icon: 'none' })
        this.refreshSites(userLoc)
        break
      }
    },

    onOpenSetting() {
      wx.openSetting({
        success: () => this.requestLocation(),
        fail: () => {}
      })
    },

    onRetryLocation() {
      this.requestLocation()
    },

    onNavigate() {
      const next = this.data.nextSite
      if (!next) return
      siteGeo.openNavigation(next).catch(() => {
        wx.showToast({ title: '无法拉起导航，请重试', icon: 'none' })
      })
    }
  }
})
